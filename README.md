# baari

**baari** (बारी, "your turn") is a walk-in queue for small clinics. Reception runs
the day's queue from a tablet, laptop or phone; patients join by scanning a QR
poster and follow their place on their own phone; a TV in the waiting room shows
who is being called. It keeps working when the clinic's internet drops.

- **Reception desk**: one big "Next patient" button that also records the consult
  time, plus Call again, Not here (moves back 2), Priority, Back 2, Skip, No-show,
  Remove, Edit name. Every tap applies instantly with a 5 second Undo (Ctrl+Z on a
  laptop). Walk-in tokens with a printable thermal slip. Pause a doctor's queue with
  a reason and an optional WhatsApp update. A staff PIN lock after 10 idle minutes.
- **Patients**: scan, type a name, get a token. No app and no sign-up. They see how
  many people are ahead with an ETA, can say how far away they are, or leave the queue.
- **TV display**: tokens only, never names; a token flashes (with an optional chime) when it is called.
- **Doctor's room button**: a big "Next patient" on a spare phone in the consult room.

Built with Next.js 15 (App Router, React 19, TypeScript, Tailwind v4) and Firebase
(Auth + Firestore with offline persistence).

## Design

The design lives in [`design/`](design):

| Path | What it is |
|------|------------|
| `design/Clinic Queue Brand.html` | The original bundled design file (8 artboards) |
| `design/screens/NN-*.html` | Each artboard extracted as readable markup with exact inline styles |
| `design/reference/NN-*.png` | A 1× screenshot of each artboard, for side-by-side checks |

Design tokens (colours, fonts, radii) are in `src/app/globals.css` under `@theme`.
[`docs/SPEC.md`](docs/SPEC.md) is the build spec: component contracts, fidelity bar,
data model.

### Screens map

| # | Artboard | Size | Built by | Live route | Dev preview |
|---|----------|------|----------|------------|-------------|
| 01 | Reception: live queue | 1180×820 | `reception/tablet/TabletReception` | `/reception` (768–1279px wide) | `/preview/live-queue` |
| 02 | Reception: add walk-in + printed slip | 1180×820 | `reception/modals/AddWalkInModal`, `TokenSlip` | "Add walk-in" | `/preview/add-walk-in` |
| 03 | Reception: start of day | 1180×820 | `TabletReception` (empty state) | `/reception` | `/preview/start-of-day` |
| 04 | Reception: pause queue | 1180×820 | `reception/modals/PauseQueueModal` | "Pause queue" | `/preview/pause-queue` |
| 05 | Reception: laptop, all doctors | 1440×900 | `reception/laptop/LaptopReception` | `/reception` (≥ 1280px) | `/preview/laptop` |
| 06 | Reception: PIN lock | 1180×820 | `reception/lock/PinLock` | after idle, or Settings menu > Lock | `/preview/pin-lock` |
| 07 | Reception: offline and undo | 1180×820 | `TabletReception` + `OfflineBanner` + `UndoToast` | when the connection drops | `/preview/offline` |
| 08 | Reception: phone (1 doctor) | 390×844 | `reception/phone/PhoneReception` | `/reception` (< 768px) | `/preview/phone`, `/preview/phone-sheet` |

The design references the TV display, QR poster, patient pages, doctor's button,
sign-in, setup and settings without drawing them; those are built in the same
visual language (see Routes).

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router, React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 with design tokens in `@theme`; Inter, Baloo 2, Noto Sans Devanagari via `next/font` |
| Auth | Firebase Auth: email/password for the clinic account, anonymous for patients |
| Data | Cloud Firestore, persistent multi-tab cache (IndexedDB), security rules in `firestore.rules` |
| Other | `qrcode` for the join QR, Vitest for the pure queue logic |

## Quick start (local emulators, no Google account needed)

Requirements: Node.js 18.18+ and **Java 11 or newer** (the Firestore emulator is a
Java program; `java -version` should work). The Firebase CLI is already a dev
dependency, so `npx firebase` needs no global install.

```bash
npm install
cp .env.example .env.local          # already points at the emulators, project "demo-baari"

npx firebase emulators:start        # terminal 1: Auth :9099, Firestore :8080, UI http://127.0.0.1:4000
node scripts/seed.mjs               # terminal 2: optional demo clinic (see below)
npm run dev                         # terminal 3: http://localhost:3000
```

A `demo-` project id makes the CLI and SDKs run fully offline against the emulators;
nothing is created in Google Cloud.

**Demo data.** `scripts/seed.mjs` signs up `owner@demo.clinic` / `password123` and
sets up *Sharma Family Clinic* with Dr. Anita Sharma (A, Room 2) and Dr. Rohit Verma
(B, Room 3), desk staff Rekha (PIN `1234`) and Suresh (PIN `5678`), and today's queue
as artboard 01 draws it: A-18 with the doctor, A-26 marked priority, A-19 "called, no
reply", A-20 to A-25 waiting, B-07 with Dr. Verma and B-08 to B-12 waiting, plus the
morning's 22 finished consults (avg consult 5.8 min, avg wait 22 min). It writes as
the signed-in owner through the client SDK, so it also exercises the security rules.
It prints the URLs to open (`/reception`, `/tv/sharma-family-clinic`,
`/q/sharma-family-clinic`, ...). `node scripts/seed.mjs --dry-run` shows the plan
without connecting. Re-running on the same day refreshes the demo tickets; restart
the emulators for a clean slate.

Or skip the seed: open http://localhost:3000, create an account and walk through
setup (clinic name, doctors with letter/room/start time, staff PINs).

Emulator data is in memory and is lost when the emulators stop. To keep it between
runs: `npx firebase emulators:start --import=.emulator-data --export-on-exit`
(and add `.emulator-data/` to `.gitignore`).

### Trying it on a real tablet or phone

Browsers only give a page `crypto.subtle` (used to check staff PINs) and the screen
wake lock on a secure origin: HTTPS, or plain HTTP on `localhost`. The emulators
speak plain HTTP, so on other devices:

- **Emulators over Wi-Fi (Chrome, including Android tablets):**
  1. In `firebase.json`, add `"host": "0.0.0.0"` to the `auth` and `firestore` emulator entries.
  2. In `.env.local`, set `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` to your computer's LAN IP
     and `NEXT_PUBLIC_AUTH_EMULATOR_URL` to `http://<LAN IP>:9099`.
  3. Run `npm run dev -- -H 0.0.0.0`.
  4. On the device, open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add
     `http://<LAN IP>:3000`, relaunch Chrome and open that address.
- **Any browser (iPad Safari too):** use a real Firebase project (below) and open the
  app over HTTPS, for example from a Vercel preview deployment.

## Using a real Firebase project

1. Create a project at https://console.firebase.google.com.
2. **Authentication > Sign-in method**: enable **Email/Password** and **Anonymous**.
3. **Firestore Database > Create database** in production mode, in a region near the
   clinic (for India, `asia-south1` Mumbai).
4. **Project settings > General > Your apps > Add app > Web**. Copy the config values
   into `.env.local` (keys as in `.env.example`) and set
   `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`.
5. Deploy the security rules and indexes:
   ```bash
   npx firebase login
   npx firebase deploy --only firestore --project <your-project-id>
   ```
   (`npx firebase use --add` saves the project as an alias so `--project` can be dropped.)
6. Restart `npm run dev`, create the clinic account at `/login` and finish `/setup`.

To host it, deploy the Next.js app anywhere that runs Next (Vercel, Firebase App
Hosting, Cloud Run) with the same `NEXT_PUBLIC_FIREBASE_*` variables set at build
time. For production, also turn on **App Check** so only your site can use the
project (see [docs/FIREBASE.md](docs/FIREBASE.md#security-notes)).

`scripts/seed.mjs` only ever connects to the emulators; it never writes to a real project.

## Routes

| Route | For | What it does |
|-------|-----|--------------|
| `/` | everyone | Sends you to sign-in, setup or reception |
| `/login` | clinic | Sign in or create the clinic account (email + password) |
| `/setup` | clinic | First run: clinic name, doctors (letter, room, start time), staff with PINs |
| `/settings` | clinic | Edit the clinic, doctors and staff (including PIN resets) |
| `/reception` | desk | The desk. Layout by width: phone < 768px, tablet 768–1279px, laptop ≥ 1280px |
| `/doctor/[clinicId]/[doctorId]` | doctor | Room button: huge "Next patient", current token, waiting count |
| `/tv/[clinicId]` | waiting room | TV display: now calling per doctor, next tokens, pause notice, join QR |
| `/poster/[clinicId]` | print | A4 QR poster, "Scan to join the queue" in English and Hindi |
| `/q/[clinicId]` | patient | Join: doctor, name, mobile (optional), visit type, how far away |
| `/q/[clinicId]/[ticketId]` | patient | Live status: token, people ahead, ETA, now serving, leave the queue |
| `/preview/*` | developers | Design previews with fixture data; development only (404 in production) |

### Design previews

`npm run dev`, then open a preview at the artboard's size and compare it with the
matching `design/reference/NN-*.png`:

| Preview | Size | Extra states |
|---------|------|--------------|
| `/preview/live-queue` | 1180×820 | |
| `/preview/add-walk-in` | 1180×820 | `?state=form` |
| `/preview/start-of-day` | 1180×820 | |
| `/preview/pause-queue` | 1180×820 | |
| `/preview/laptop` | 1440×900 | `?state=...` |
| `/preview/pin-lock` | 1180×820 | unlock with 1234 |
| `/preview/offline` | 1180×820 | |
| `/preview/phone`, `/preview/phone-sheet` | 390×844 | `?state=paused\|fresh\|idle\|offline\|doctors` |
| `/preview/tv`, `/preview/patient-status`, `/preview/login`, `/preview/setup` | | screens with no artboard |

## How the queue works

- **Today** is the clinic-local date (`YYYY-MM-DD` in the clinic's time zone). Every
  query filters on it, so the queue starts fresh at midnight with no cleanup job.
- **Tokens** are per doctor per day: `queues/{doctorId}_{date}.lastToken` is the
  counter and labels read `A-07`, `B-12` (the doctor's letter). Walk-ins and QR joins
  take numbers in a transaction so they never clash.
- **Lifecycle**: `waiting → serving → done`, or `waiting → no_show | removed`.
  "Not here" sends `serving → waiting` two places back, flagged "Called, no reply".
- **Order**: priority first, then a sortable `position`, then token number.
- **ETAs**: people ahead × today's average consult (the clinic default until the
  first consult finishes), shown as a 5-minute range.

The data model and security rules are documented in [docs/FIREBASE.md](docs/FIREBASE.md).

## Offline behaviour

The desk is built to keep going when the internet drops:

- Firestore runs with a persistent IndexedDB cache shared across tabs. Every desk
  action is a plain batched write, which applies to the screen instantly and is queued
  on the device until the connection is back. Timestamps come from the device clock,
  so timers and ordering work offline.
- The desk shows "Internet is down. Keep working, we'll catch up." with how long it
  has been offline and how many taps are saved on the device; changed rows show
  "Not synced" until the server has them.
- A walk-in issued offline takes the next number from the desk's cached counter.
  If a patient joined by QR during the same outage the two can share a label; the desk
  shows both, and the shared counter is incremented safely when the writes sync.
- Patient phones and the TV catch up as soon as the desk's writes reach the server.
  Joining by QR needs a connection on the patient's phone (it is a transaction).
- WhatsApp alerts are queued as outbox documents with the rest of the writes and go
  out when the connection is back.

## WhatsApp: the outbox integration point

The app never sends WhatsApp messages itself. When reception pauses a queue with
"Also send a WhatsApp update" ticked, the desk writes one document per waiting
patient with a phone number to `clinics/{clinicId}/outbox/{id}`:

```ts
{ clinicId, to: "9829012345", kind: "pause", body: "Sharma Family Clinic, token A-21. Doctor is on a short break (Lunch). ...", status: "queued", createdAt }
```

`kind` is one of `pause | resume | turn_soon | joined` (only `pause` is written today).
To deliver them, deploy a server-side sender that uses the Admin SDK (which bypasses
security rules). Browsers can create outbox documents but never update or delete
them. For example, a Cloud Function (not part of this repo):

```ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";

export const sendWhatsApp = onDocumentCreated("clinics/{clinicId}/outbox/{id}", async (event) => {
  const msg = event.data?.data();
  if (!event.data || msg?.status !== "queued") return;
  try {
    await sendWhatsAppText(`+91${msg.to}`, msg.body); // WhatsApp Cloud API, Twilio, Gupshup, ...
    await event.data.ref.update({ status: "sent", sentAt: Date.now() });
  } catch (err) {
    await event.data.ref.update({ status: "failed", error: String(err) });
  }
});
```

WhatsApp Business only allows business-initiated messages through pre-approved
templates, so map each `kind` to a template and pass the token, reason and time as
template parameters.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Next.js dev server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Vitest: queue rules, desk handlers, search |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js config) |
| `npx firebase emulators:start` | Local Auth + Firestore emulators with the project's rules |
| `node scripts/seed.mjs [--dry-run]` | Demo clinic and today's queue in the emulators |
| `npx firebase deploy --only firestore` | Deploy `firestore.rules` and `firestore.indexes.json` |

## Project layout

```
design/                  original design file, extracted artboards, reference PNGs
docs/SPEC.md             build spec: tokens, data model, component contracts
docs/FIREBASE.md         data model, security rules rationale, security notes
firestore.rules          Firestore security rules
firestore.indexes.json   composite indexes (none needed today)
firebase.json            Firebase CLI config: rules, indexes, emulators
scripts/seed.mjs         demo data for the emulators
src/app/                 routes (reception, tv, q, poster, doctor, login, setup, settings, preview)
src/components/          reception (tablet, laptop, phone, modals, lock), public, auth, brand, icons
src/lib/                 firebase, hooks, types, paths, time, pin, view models, fixtures
src/lib/queue/           logic (pure rules), actions (desk writes), patient (QR joins)
src/lib/clinic-admin.ts  setup and settings writes
```
