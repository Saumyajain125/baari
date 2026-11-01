# Firebase: data model, rules and security notes

How baari uses Firebase, why `firestore.rules` is shaped the way it is, and what it
does and doesn't protect. Types are in `src/lib/types.ts`, every path string is in
`src/lib/paths.ts`.

## Who signs in

| Caller | Auth | Can do |
|--------|------|--------|
| **Clinic account** | Email/password, one per clinic, shared by the clinic's devices (desk tablet, laptop, doctor's phone) | Everything in its own clinic. Its uid has `clinics/{c}/members/{uid}` (role `owner`), and `users/{uid}.clinicId` points the app at the clinic. |
| **Patient** | Anonymous, created silently on the join page and kept by the phone's browser | Take the next token by QR, read their own name back, change how far away they are, leave the queue. |
| **Anyone** | None | Public reads for the TV display, QR poster and join page: clinic, doctors, queue days, tickets (no names or phones). |

Staff at the desk (Rekha, Suresh) are **not** Firebase users. The PIN lock is a
device lock on top of the clinic account; see [Security notes](#security-notes).

The `members` collection also supports `desk` members (other accounts allowed to run
the desk), which only the owner can add. No screen creates them yet.

## Collections

```
users/{uid}                                  UserProfile    the account itself
clinics/{clinicId}                           Clinic         public get
clinics/{clinicId}/members/{uid}             Member         members
clinics/{clinicId}/doctors/{doctorId}        Doctor         public read
clinics/{clinicId}/staff/{staffId}           Staff          members (PIN hashes)
clinics/{clinicId}/queues/{doctorId}_{date}  QueueDay       public read
clinics/{clinicId}/tickets/{ticketId}        Ticket         public read, no PII
clinics/{clinicId}/ticketPrivate/{ticketId}  TicketPrivate  members + the patient who joined
clinics/{clinicId}/outbox/{id}               (unused)       members create/read
```

| Document | Fields | Notes |
|----------|--------|-------|
| `users/{uid}` | `clinicId` | Only this field. Can only point at a clinic the account owns or is a member of. |
| `clinics/{c}` | `name`, `ownerUid`, `timezone`, `defaultConsultMin`, `lockAfterMin`, `createdAt` | `ownerUid` never changes. Clinics can be fetched by id but not listed. |
| `members/{uid}` | `uid`, `role` (`owner` \| `desk`), `addedAt` | Doc id is the member's uid. Only the clinic's owner can hold `owner`. |
| `doctors/{id}` | `name`, `prefix` (one letter A to Z), `room`, `order`, `startsAt` (`"HH:mm"` or null), `active` | Inactive doctors keep their history but leave the desk, TV and join page. |
| `staff/{id}` | `name`, `initials`, `pinHash`, `pinSalt`, `order` | `pinHash = hex(SHA-256(pinSalt + ":" + pin))` (`src/lib/pin.ts`). |
| `queues/{doctorId}_{date}` | `clinicId`, `doctorId`, `date`, `lastToken`, `paused` (`{reason, since, backAt}` or null), `doctorButtonSeenAt` | One per doctor per clinic-local day. Desk writes merge into it, so any of the last three may be missing. |
| `tickets/{id}` | `clinicId`, `doctorId`, `date`, `token`, `label`, `status`, `position`, `priority`, `visitType`, `distance`, `source`, `createdAt`, `calledAt`, `lastCallAt`, `callCount`, `noReplyAt`, `finishedAt`, `consultMs`, `updatedBy`, `updatedAt` | Everything the TV and patient pages need, nothing that identifies a person. |
| `ticketPrivate/{id}` | `clinicId`, `date`, `name`, `phone` (10 digits or null), `patientUid` | Same id as its ticket. `patientUid` is the anonymous uid of a QR patient, null for walk-ins. |
| `outbox/{id}` | `clinicId`, `to` (10 digits), `kind`, `body`, `status` (`queued`), `createdAt` | Not written by the app. Older builds queued WhatsApp pause messages here; nothing sends them. See [NOTIFICATIONS.md](NOTIFICATIONS.md). |

**Dates and times.** `date` is the clinic-local `YYYY-MM-DD` (`src/lib/time.ts#dateKey`)
and every query filters on it, so "today" resets at midnight with no cleanup job.
All timestamps are epoch milliseconds from the writing device's clock, never
`serverTimestamp()`: those are null until a write syncs, which would break the desk's
timers and ordering while offline.

## Every client write and the rule that allows it

| Write | Source | Allowed by |
|-------|--------|-----------|
| First-run setup: clinic + owner member + `users/{uid}` + doctors + staff, one batch | `createClinicWithSetup` (`src/lib/clinic-admin.ts`), `scripts/seed.mjs` | Clinic: `create` by a non-anonymous account naming itself `ownerUid`. Member: `ownsClinicAfter`. User doc: `existsAfter` of the member. Doctors and staff: `isSettingUp` (the clinic doc doesn't exist before the batch and its owner after the batch is the caller). |
| Edit clinic, add/edit/deactivate doctors, add staff, reset PIN, remove staff | `updateClinic`, `upsertDoctor`, `setDoctorActive`, `addStaff`, `resetStaffPin`, `removeStaff` | `isMember` + full-document shape check |
| Next patient, Call again, Not here, Priority, Back 2, Skip, No-show, Remove, Edit name, and Undo of each | `src/lib/queue/actions.ts` | `isMember` + `validTicket` / `validPrivate` on the resulting document |
| Walk-in (online: transaction; offline: batch with `increment(1)`) | `addWalkIn` | `isMember` + `validQueue`, `validTicket`, `validPrivate` |
| Pause, Resume, doctor's button heartbeat | `pauseQueue`, `resumeQueue`, `doctorButtonHeartbeat` | `isMember` + `validQueue` (merge writes) |
| Patient joins by QR: transaction creating or bumping the queue day, the ticket and its private doc | `joinQueue` (`src/lib/queue/patient.ts`) | `patientOpensQueue` or `patientTakesToken`, `patientJoins`, `patientCreatesPrivate` |
| Patient updates how far they are | `updateDistance` | `patientOwnsTicket` + `patientUpdatesDistance` |
| Patient leaves the queue | `leaveQueue` | `patientOwnsTicket` + `patientLeaves` |

A signed-in clinic account that opens the join page on its own device is a member,
so its join goes through the member branch; the patient branch is for everyone else.

## How the rules are built

**Deny by default.** Only the paths above have `allow` statements.

**Membership is one document read.** `isMember(c)` is `exists()` on
`clinics/{c}/members/{auth.uid}`. Rules may make at most 10 document reads per write
and 20 per batch or transaction. Firestore caches repeated reads of the same document
within a request, which is what keeps the desk's bigger batches (the setup batch with
many doctors) at a handful of reads. `scripts/seed.mjs` commits in batches of 20 writes so it doesn't depend on
that cache.

**Setup in one batch.** `exists()`/`get()` see the database before a batch,
`existsAfter()`/`getAfter()` see it after. The setup batch creates the member doc at
the same time as the doctors and staff, so those use `isSettingUp(c)`: the clinic
doesn't exist yet and, after the batch, is owned by the caller. A half-created clinic
can never exist.

**Desk writes are trusted but shaped.** Members may write any ticket, queue day or
private doc in their clinic as long as the result has exactly the expected fields
with the right types and bounded strings (`hasExactly`, `isText`, `isTime`, ...).
Desk actions are plain batched writes that must apply offline, so the rules don't try
to re-derive desk logic (who's next, where "Back 2" lands); they make sure the data
stays well-formed and in the right clinic.

**Patient branches only run for non-members.** The ticket, queue and private rules
are written as `isMember(c) ? <shape check> : <patient check>`. The patient checks read
several other documents (doctor, queue day before and after, private doc or ticket);
the ternary keeps them off desk writes entirely, so desk batches never spend their
read allowance on them.

**What a QR join must look like** (`patientJoins`, `patientOpensQueue`,
`patientTakesToken`, `patientCreatesPrivate`):

- The queue day's `lastToken` moves on by exactly one in the same transaction (or the
  day is created with `lastToken: 1`, unpaused, no heartbeat), and the ticket's `token`
  is that new number. A patient can't reuse or pick a number, and can't touch
  `paused` or `doctorButtonSeenAt`.
- `label` is the doctor's prefix plus the token (`A-07`) and `position` is
  `token * 1000`, so the desk orders it like any other ticket.
- It starts as a plain waiting ticket: `source: "qr"`, `status: "waiting"`,
  `priority: false` (only reception can mark priority, even for an emergency visit),
  `callCount: 0`, every call and finish time null, `updatedBy: "patient"`.
- The doctor exists and is active.
- The ticket's private doc is created in the same transaction with
  `patientUid == auth.uid`, and that private doc can only be created alongside a brand
  new `qr` ticket for the same date. This binds the ticket to the patient's anonymous
  uid, which is what later lets them (and only them) change it.

**What a patient may change later**: only `distance` (+ `updatedAt`, `updatedBy`)
while waiting or being served, or `status: "waiting" → "removed"` with `finishedAt`.
Ownership is checked through `ticketPrivate/{id}.patientUid`.

**Outbox is kept but unused.** Older builds wrote one `queued` WhatsApp message per
waiting patient when a queue was paused; the app no longer does, and nothing sends
them. The rule (members create and read, nobody updates or deletes) stays so a desk
tab still on an older build, or holding a pause saved offline, doesn't have its whole
pause batch refused. When patient messages are built, the plan is for the server to
write this collection itself ([NOTIFICATIONS.md](NOTIFICATIONS.md)), after which the
client `create` rule can go.

## Security notes

- **Public tickets carry no PII.** Tickets, queue days, doctors and the clinic doc are
  public because the TV display and the patient's status page are opened without an
  account. They hold token numbers, doctor, status, visit type, distance and times,
  never a name or phone number. Those live in `ticketPrivate`, readable only by the
  clinic's members and by the one anonymous patient who created that ticket.
  The TV shows tokens only.
- **Clinics can't be enumerated.** `clinics/{c}` allows `get` but not `list`; a clinic id
  is only learned from its QR poster or TV link. Tickets of a known clinic can be listed
  (the TV needs that), which reveals how busy it is, not who is there.
- **The PIN lock is a device lock, not an account boundary.** It stops a patient from
  tapping an unattended tablet and records which staff member made each change
  (`updatedBy`). Anyone with the clinic account's password is past it, and `updatedBy`
  is set by the client, so treat it as an honest-actor audit trail. A 4 digit PIN has
  10,000 combinations; the salted hash only keeps raw PINs out of Firestore, which is why
  `staff` is readable by members only. Protect the clinic account with a strong password.
- **Anonymous patients are untrusted.** They can only create a well-formed waiting
  ticket bound to themselves, move the day's counter forward by one, and change their own
  distance or leave. Rules can't rate-limit: a hostile script could still create many
  tickets or burn token numbers. For production, enable **Firebase App Check**
  (reCAPTCHA Enterprise / Play Integrity) and enforce it for Firestore and Auth, and
  consider limiting anonymous sign-ups. Reception can remove junk tickets at any time.
- **Device clocks are trusted for display only.** Timestamps come from the device so the
  desk works offline. A wrong clock skews wait timers and stats, but ordering uses
  `priority`, `position` and `token`. The one access decision that looks at a client
  time is a QR join: the ticket's `createdAt` and `updatedAt` must be within 5 minutes
  of the server's clock (`isNearNow`), so a phone set to the wrong time can't join. The
  join page then asks the patient to set the date and time automatically or ask at
  reception (`PatientFacingError` in `src/lib/queue/patient.ts`); desk writes have no
  such check because they may sync long after an outage. To spot a call made moments
  ago, the doctor's button doesn't rely on the desk's `calledAt` alone (the two clocks
  can disagree): it also goes by when it first saw that call.
- **Offline walk-ins can share a label.** A walk-in issued offline uses the desk's cached
  counter, so if a QR patient joined during the same outage both can get, say, A-27. The
  counter itself is incremented atomically when the desk syncs, and the desk shows both
  tickets.
- **API keys are not secrets.** The `NEXT_PUBLIC_FIREBASE_*` values identify the project to
  browsers; access is enforced by these rules (and App Check, once enabled).
- **Data retention.** Tickets and their private docs stay after the day ends (they feed
  history and could feed reports). Names and phone numbers are personal data; for
  production, add an expiry (for example a Firestore TTL policy on a timestamp field
  written alongside `ticketPrivate`, or a scheduled function deleting old dates) that
  matches the clinic's retention policy.
- **Seed and emulators.** `scripts/seed.mjs` only connects to the emulators. The `demo-`
  project id in `.firebaserc` means the CLI never reaches a real project by accident.

## Indexes

Every query is an equality filter on `date` (tickets, ticketPrivate, queues;
`src/lib/hooks.ts`), a range on `date` alone (`useTicketsBetween`, the public tickets
behind `/insights`), or a single `orderBy("order")` (doctors, staff). Firestore's
automatic single-field indexes cover all of them, so `firestore.indexes.json` declares
no composite indexes. Insights filter by doctor and status in the browser for the same
reason. A query that combines a filter with an order on another field,
for example `where("active", "==", true)` plus `orderBy("order")`, would need one.

## Checking the rules

No automated rules tests ship yet. With the emulators running (`npx firebase emulators:start`):

- `node scripts/seed.mjs` exercises the setup batch and the desk's member writes.
- The app exercises the rest: run the desk at `/reception`, join from a private window at
  `/q/{clinicId}` (a separate anonymous user), change distance and leave from the status page.
- The Emulator UI (http://127.0.0.1:4000) has a **Firestore > Requests** tab that shows
  every allowed or denied request with the rule that decided it.

To automate this, add `@firebase/rules-unit-testing` and cover at least: a patient can't
set `priority`, reuse the current `lastToken`, read another patient's private doc, or
leave a ticket that is already being served; a non-member can't read `staff`,
`ticketPrivate` or `outbox`; an account can't point `users/{uid}` at someone else's clinic.
