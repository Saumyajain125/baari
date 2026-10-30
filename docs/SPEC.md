# baari: clinic queue: build spec

baari ("your turn") is a walk-in queue for small clinics. Reception runs the queue
from a tablet, laptop or phone; patients join by scanning a QR poster and watch a
TV display. This app is **Next.js 15 (App Router, React 19, TypeScript, Tailwind v4)**
with **Firebase (Auth + Firestore with offline persistence)** as the backend.

## Design source of truth

- `design/Clinic Queue Brand.html`: the original bundled design file (8 artboards).
- `design/screens/NN-*.html`: the same artboards, extracted, readable markup with
  exact inline styles. **Read the HTML for exact sizes, colours, spacing and copy.**
- `design/reference/NN-*.png`: screenshots of each artboard at 1×. **Compare your
  rendering against these.**

| # | Artboard | Size | Built by |
|---|----------|------|----------|
| 01 | Reception: live queue | 1180×820 | `TabletReception` |
| 02 | Reception: add walk-in (dialog + printed slip) | 1180×820 | `AddWalkInModal` |
| 03 | Reception: start of day (empty state) | 1180×820 | `TabletReception` |
| 04 | Reception: pause queue (dialog) | 1180×820 | `PauseQueueModal` |
| 05 | Reception: laptop, all doctors | 1440×900 | `LaptopReception` |
| 06 | Reception: PIN lock | 1180×820 | `PinLock` |
| 07 | Reception: offline and undo | 1180×820 | `TabletReception` (offline) + `OfflineBanner` + `UndoToast` |
| 08 | Reception: phone (1 doctor) | 390×844 | `PhoneReception` |

Fidelity bar: at the artboard size, a side-by-side with the reference PNG should be
hard to tell apart (same layout, sizes, colours, weights, radii, copy). Replace the
artboard's fixed `width/height` with full-viewport layouts (`h-dvh`, flex) that land
on exactly the artboard's geometry at that viewport size and degrade gracefully
around it. The modal artboards show a solid `#8A9493` backdrop; in the app use a
scrim over the live screen (`bg-scrim/90` or similar); the preview may render the
solid colour to match the reference.

## Visual language (already set up; use it)

- Tokens live in `src/app/globals.css` under `@theme`; use Tailwind utilities:
  `bg-canvas`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `border-line-strong`,
  `border-divider`, `bg-subtle`, `bg-teal`, `text-teal-dark`, `bg-teal-tint`,
  `text-danger`, `bg-danger-tint`, `text-warn`, `bg-warn-tint`, `bg-amber-tint`,
  `text-amber`, `text-indigo`, `bg-indigo-tint`, `bg-scrim` etc. Arbitrary values
  (`text-[26px]`, `rounded-[14px]`, `h-[52px]`) are expected: match the design's
  numbers exactly. No raw hex in components except one-off design values with no token.
- Fonts (`next/font`, wired in `layout.tsx`): `font-sans` = Inter (+ Noto Sans
  Devanagari fallback for Hindi), `font-display` = Baloo 2 (tokens, headings,
  big buttons: weights 600/700/800), `font-slip` = Courier New (token slip).
- Icons: `src/components/icons.tsx` (all design icons, 24-grid, `size` prop).
  Logo: `src/components/brand/Logo.tsx` (`LogoMark` variants `brand|inverse|empty`).
- Touch targets ≥ 44px, as the design does. Buttons need real `aria-label`s where
  icon-only (copy the design's labels). Visible focus is global (`:focus-visible`).
- Copy is part of the design: reuse the exact strings from the artboards.

## Data model (done; read `src/lib/types.ts`)

```
clinics/{clinicId}                     Clinic          public read
clinics/{clinicId}/members/{uid}       Member          devices allowed to run the desk
clinics/{clinicId}/doctors/{doctorId}  Doctor          public read
clinics/{clinicId}/staff/{staffId}     Staff           members only (PIN hashes)
clinics/{clinicId}/queues/{doctorId}_{date}  QueueDay  public read (lastToken, paused, doctor heartbeat)
clinics/{clinicId}/tickets/{id}        Ticket          public read, NO names/phones
clinics/{clinicId}/ticketPrivate/{id}  TicketPrivate   members + the patient who joined (name, phone)
clinics/{clinicId}/outbox/{id}         OutboxMessage   WhatsApp messages queued for a sender
users/{uid}                            UserProfile     { clinicId } for the signed-in clinic account
```

- Timestamps are epoch ms from the device clock (offline-safe). "Today" is the
  clinic-local `YYYY-MM-DD` (`src/lib/time.ts#dateKey`); queries filter on `date`,
  which is how "Yesterday's queue was cleared at midnight" works: no cleanup job.
- Ticket lifecycle: `waiting → serving → done`, or `waiting → no_show | removed`.
  "Not here" sends `serving → waiting` (moved back 2, `noReplyAt` set).
- Ordering: `compareWaiting` = priority first, then `position`, then token.

## Foundation modules (done; **read-only for screen agents**)

| File | What it gives you |
|------|-------------------|
| `src/lib/types.ts` | Firestore types, `DeskTicket` (ticket + name/phone + `pending`) |
| `src/lib/time.ts` | `dateKey`, `formatDayShort`, `formatClock`, `formatElapsed`, `formatHHmm`, `formatSlipStamp`, `sessionOf` |
| `src/lib/queue/logic.ts` | ordering, moves, stats, `estimateWait`/`formatEstimate`, `maskPhone`, `normalizePhone`, `QueueRowView` + `toRowView`, label maps |
| `src/lib/queue/actions.ts` | all desk writes (`callNext`, `callAgain`, `notHere`, `togglePriority`, `moveBack`, `skipToEnd`, `markNoShow`, `removeTicket`, `editName`, `addWalkIn`, `pauseQueue`, `resumeQueue`, `doctorButtonHeartbeat`) + `undo(entry)` |
| `src/lib/hooks.ts` | `useAuthUser`, `useUserProfile`, `useClinic`, `useDoctors`, `useStaff`, `useQueueDays`, `useDeskTickets`, `usePublicTickets`, `useTicket`, `useToday`, `useNow`, `useConnectivity`, `useMediaQuery`, doc mappers `toTicket` etc. |
| `src/lib/view.ts` | View models: `ClinicHeaderView`, `DoctorTabView`, `DoctorQueueView`, `ServingView`, `NextUpView`, `PauseView`, `QueueRowView`; builders `buildClinicHeader`, `buildDoctorQueueView` |
| `src/lib/fixtures.ts` | Exact design data as view models (`designHeader`, `sharmaQueue`, `vermaQueue`, `designDoctors`, `startOfDayQueues`, `offlineQueue`, `phoneHeader`, `phoneQueue`, `designStaff`) |
| `src/lib/firebase.ts` | `getDb()`, `getFirebaseAuth()`, `firebaseConfigured` |
| `src/lib/paths.ts` | every Firestore path |
| `src/lib/pin.ts` | `hashPin`, `verifyPin`, `newSalt`, `isValidPin`, `initialsOf` |
| `src/components/reception/handlers.ts` | `ReceptionHandlers`, `WalkInFormInput`, `IssuedSlip`, `PauseFormInput`, `pauseMessage()` |

If a foundation module is missing something you need, **don't edit it**: put a
local helper in your own files and list the gap in your final report.

## Component contracts

All reception layouts are **presentational**: props in, callbacks out, no Firebase
imports. That keeps them previewable with fixtures. Mark files `"use client"` when
they hold state or handlers.

### Shared pieces (owned by the Tablet agent; others import them)

```ts
// src/components/reception/OfflineBanner.tsx
export function OfflineBanner(props: { offlineFor: string /* "1:24" */; pendingCount: number }): JSX.Element
// Artboard 07 top banner: "Internet is down. Keep working, we'll catch up." /
// "{n} taps saved on this tablet. Patient phones and the TV will update when the
// connection is back. WhatsApp alerts are on hold." + pill "Offline 1:24".

// src/components/reception/UndoToast.tsx
export function UndoToast(props: { message: string; secondsLeft: number; onUndo(): void }): JSX.Element
// Artboard 07 bottom-centre dark toast, fixed position, role="status": check icon,
// message, teal-bright button "Undo · 4s".

// src/components/reception/ClinicIdentity.tsx
export function ClinicIdentity(props: { clinicName: string; subtitle: string }): JSX.Element
// Logo + clinic name (Baloo 700 17px) + subtitle (12px muted). Used by tablet header.
```

### TabletReception (artboards 01, 03, 07)

```ts
// src/components/reception/tablet/TabletReception.tsx
export interface TabletReceptionProps {
  header: ClinicHeaderView;
  doctors: DoctorTabView[];          // tab bar; hide the tab bar entirely if only one doctor? No: show it (it carries "N waiting").
  selectedDoctorId: string;
  queue: DoctorQueueView;            // the selected doctor's queue
  offline: { offlineFor: string; pendingCount: number } | null;  // null = online
  handlers: ReceptionHandlers;
}
```

- Header: identity (subtitle `"{dateLabel} · {session} session"`), four stat tiles
  (`In queue`, `Served today`, `Avg consult` (+ small "default" suffix in muted when
  `avgConsultIsDefault`, as artboard 03), `Avg wait`, hidden when null), "Add walk-in",
  TV button (`aria-label="Open TV display"`), Settings button.
- Doctor tabs: selected = 2px teal border, teal letter tile, `N waiting` pill tinted;
  others 1px line border, tint letter tile, grey pill. `startsAtLabel` replaces the
  pill ("Starts 11:00 AM"). Paused doctors show a pill "Paused". Right side: "Pause
  queue" (or, when the selected doctor is paused, a teal "Resume queue" button with
  `PlayIcon`).
- Left column (360px): "With doctor now" card (timer `6:12 in room`, big token
  64px Baloo 800 teal, name 18px/600, `phone · visit type`). When `serving.pending`
  the second line reads "Saved offline, not synced" in `text-warn` 600 (artboard 07).
  Below the card, a discreet text button "Not here? Move back 2" that calls
  `onNotHere` (needed to produce the design's "Called, no reply" state; style it as a
  quiet link-button, 13px, muted, so the artboard composition stays intact).
- Big "Next patient →" button (teal, radius 24, `box-shadow: 0 6px 0 #0A5958`,
  min-height 220, fills the column): line 2 `Calls <strong>{label} {name}</strong>`
  (+ " (priority)"); line 3 `Saves {servingLabel} as done · {consultMin} min consult`.
  Offline: line 2 becomes "Still works offline. Call the name out loud.". Pressed
  state: translateY(4px) + shorter shadow. Disabled/empty variants:
  - Nobody waiting and nobody serving → artboard 03 dashed disabled button
    ("Next patient" / "Turns on when someone joins").
  - Serving but nobody waiting → enabled, line 2 "Nobody waiting", line 3 "Saves A-18 as done".
  - Paused → disabled-looking dashed variant, "Queue paused" / "Resume to call the next patient".
- Under it: "Call again" (bell) + "Doctor's button linked" status chip (dot). When
  not linked show a muted chip "Doctor's button not linked".
- Empty "With doctor now" (artboard 03): placeholder token `{prefix}-00` in
  `text-line-strong`, "Nobody yet. First token today will be {nextTokenLabel}."
- Right panel "Up next · N" with hint "Tap an action, no confirm needed. Undo appears
  for 5 s." Rows exactly as artboard 01: token (Baloo 800 26px; danger colour for
  priority), name + muted phone (or "no phone"), badges row: `PRIORITY` (danger
  solid), `Called, no reply {noReplyElapsed}` (amber), visit type (New = teal tint,
  Follow-up = indigo tint, Emergency = danger tint), distance (subtle). Waited
  (right, 600, warn when `longWait`), five 52×52 action buttons: Priority, Back 2,
  Skip, No-show, Remove (Remove in danger colour). Row tone bg: priority
  `bg-danger-tint`, noReply `bg-warn-tint`. Pending rows show "Not synced" (warn,
  12px 600) next to the waited time. The list scrolls inside the panel.
- Start of day (no rows, nobody serving): right panel becomes the artboard 03 empty
  state: `LogoMark variant="empty" size={120}`, "Fresh queue for today", copy, and
  "Print QR poster" / "Open TV display" buttons.
- Offline (`offline` not null): render `OfflineBanner` above the header.

### LaptopReception (artboard 05)

```ts
// src/components/reception/laptop/LaptopReception.tsx
export interface LaptopReceptionProps {
  header: ClinicHeaderView;
  queues: DoctorQueueView[];         // one column per doctor, 2-up grid (1 doctor = full width)
  offline: { offlineFor: string; pendingCount: number } | null;
  handlers: ReceptionHandlers;
}
```

- Header 68px: logo, clinic name (Baloo 700 18px), "Thu, 29 Oct · Morning", inline
  stats (`In queue 14  Served 31  Avg consult 5.8 min  Avg wait 22 min`), search box
  (240px, "Find token, name or phone") that filters every doctor's rows by
  label/name/phone digits, "Add walk-in [W]" with `.kbd` chip.
- Per doctor: letter tile, name, `Room 2 · 9 waiting`, "Pause"/"Resume" button;
  now-serving card (44px token) + Next button (240px, `Next patient [A]`, "Calls …");
  table with columns Token / Patient / Type / Distance / Waited / Actions; row icon
  buttons Priority, Back 2, More (⋯ opens a menu: Skip, No-show, Remove, Edit name).
  Walk-ins show the phone column as "walk-in" when they have no phone.
- Footer hint line exactly as the artboard ("Keyboard: A next for Dr. Sharma · …").
- Keyboard (ignored while typing in an input/textarea or when a dialog is open):
  doctor prefix letter → `onNext(doctorId)`; `W` → `onAddWalkIn()`; `/` → focus
  search; `Ctrl/Cmd+Z` → `onUndo()`; `Esc` in search clears it.
- Edit name: inline prompt/dialog styled in the design language; calls `onEditName`.

### PhoneReception (artboard 08)

```ts
// src/components/reception/phone/PhoneReception.tsx
export interface PhoneReceptionProps {
  header: ClinicHeaderView;
  doctors: DoctorTabView[];          // if more than one, show a compact switcher under the header
  selectedDoctorId: string;
  queue: DoctorQueueView;
  offline: { offlineFor: string; pendingCount: number } | null;
  handlers: ReceptionHandlers;
}
```

- Header: clinic name + `"{waiting} waiting · {served} served · {avgConsult} avg"`
  ("6 min avg"), pause icon button (or resume when paused).
- Serving card (44px token, "With doctor · 4:05", name, call-again icon button).
- "UP NEXT · tap ⋯ for skip, no-show, priority"; rows: token 22px, name 15px/600,
  meta `New · Here · 31 min`; ⋯ button (`aria-label="Actions for A-32"`) opens a
  bottom action sheet (Priority, Back 2, Skip, No-show, Remove, Edit name, Cancel)
  with 56px rows, proper dialog semantics, Esc/backdrop to close.
- Footer: 72×72 "Walk-in" button + big "Next patient →" ("Calls A-32 Rajat Bansal").
- Offline: compact version of the banner (reuse `OfflineBanner`; it must wrap well at 390px).

### Modals

```ts
// src/components/reception/modals/AddWalkInModal.tsx  (artboard 02)
export interface AddWalkInModalProps {
  open: boolean;
  doctors: DoctorTabView[];
  defaultDoctorId: string;
  nextTokenLabelFor(doctorId: string): string;     // "A-25" → button "Issue token A-25"
  onClose(): void;
  onSubmit(input: WalkInFormInput): Promise<IssuedSlip>;
}
```
Form: doctor choice (2-col grid of toggle buttons `A · Dr. Anita Sharma`), Patient
name (autofocus, required), Mobile "(optional, for WhatsApp updates)" with
placeholder "Leave empty if no smartphone" (validate with `normalizePhone`, inline
error), Visit type (New / Follow-up / Emergency; Emergency styled danger and
explained as "goes to the front"), Cancel + "Issue token A-25". After submit the
**slip card** (right panel in the artboard) appears: "✓ Token issued", printed-slip
preview (Courier, dashed border, `SHARMA FAMILY CLINIC`, `Dr. Anita Sharma · Room 2`,
token 72px Baloo 800, `7 ahead · approx 35 to 45 min`, Hindi `आपसे पहले 7 लोग`
(`lang="hi"`), "Watch the TV screen for your number", stamp), "Print slip"
(window.print(); only the slip prints: use `print-only`/`no-print` classes, slip
sized for 58/80mm thermal paper) and "Done" (closes), plus the "No printer? …" note.
Enter submits; Esc closes; focus is trapped; on narrow screens the slip replaces
the form instead of sitting beside it.

```ts
// src/components/reception/modals/PauseQueueModal.tsx  (artboard 04)
export interface PauseQueueModalProps {
  open: boolean;
  doctorName: string;
  waitingWithPhone: number;          // "Also send a WhatsApp update to the 9 people waiting"
  now: number;                       // for "45 min (1:30 PM)" labels
  timezone: string;
  onClose(): void;
  onConfirm(input: PauseFormInput): void;
}
```
Reason chips (Lunch break, Emergency case, Ward round, Tea break, Type your own →
reveals a text input), Back in chips (15 min, 30 min, 45 min, Not sure; the
selected one shows its clock time "(1:30 PM)"), preview box "Patients and TV will
show" using `pauseMessage(shortReason, backAtLabel)` where shortReason drops " break"/
" case" ("Lunch break" → "Lunch"), WhatsApp checkbox (hidden when 0 phones), Cancel +
dark "Pause queue" button. Default selection as in the artboard (Lunch, 45 min).

### PinLock (artboard 06)

```ts
// src/components/reception/lock/PinLock.tsx
export interface PinLockProps {
  clinicName: string;
  dateLabel: string;                 // "Thu, 29 Oct"
  lockAfterMin: number;              // "Locked automatically after 10 min idle …"
  staff: { id: string; name: string; initials: string }[];
  defaultStaffId?: string;
  onVerify(staffId: string, pin: string): Promise<boolean>;
  onUnlocked(staffId: string): void;
  onForgot(): void;
}
// src/components/reception/lock/useIdleLock.ts
export function useIdleLock(opts: { minutes: number; enabled: boolean; onIdle(): void }): void
```
Left teal panel (inverse logo + "baari" wordmark Baloo 800 32px, clinic name 40px,
"Reception · Thu, 29 Oct", pill "Queue keeps running while locked", footnote).
Right: "Who's at the desk?", staff toggle cards, "Enter your 4 digit PIN", 4 dots
(`aria-label="2 of 4 digits entered"`), keypad 3×4 (76px keys, Forgot? / 0 / ⌫).
Physical keyboard digits/Backspace work. On 4th digit call `onVerify`; on failure
shake the dots, show "Wrong PIN, try again" and clear. On narrow screens the teal
panel collapses to a header strip.

### Public & supporting surfaces (no artboard; extend the design language)

These are referenced by the design ("Open TV display", "Print QR poster", "Patients
who scan the QR poster show up here", "Doctor's button linked", "Settings") but not
drawn. Build them in the same visual language (tokens, Baloo tokens, teal, 14–24px
radii, generous touch targets). Keep them calm and legible from a distance.

- `/tv/[clinicId]`: TV display (landscape, auto-fits): per doctor "Now calling"
  token huge, next 5 tokens, paused banner (`pauseMessage`), clinic name, clock,
  QR + "Scan to join the queue". Flash/animate + optional chime when a token's
  `lastCallAt` changes. Tokens only, never names.
- `/q/[clinicId]`: patient join (mobile): pick doctor, name, mobile (optional),
  visit type, "How far are you?" (Here / Under 15 min / 15 to 30 min / Over 30 min).
  Uses anonymous auth + a transaction (`src/lib/queue/patient.ts`). Then redirect to:
- `/q/[clinicId]/[ticketId]`: patient status: big token, "N ahead · approx X to Y min",
  Hindi line, now serving, paused message, "update how far you are", "leave the
  queue"; celebratory "It's your turn, please go to Room 2" when called.
- `/poster/[clinicId]`: printable A4 QR poster ("Scan to join the queue" + Hindi).
- `/doctor/[clinicId]/[doctorId]`: the doctor's room button (signed-in device): huge
  "Next patient" + current token + waiting count; sends `doctorButtonHeartbeat` every 30 s.
- `/login`, `/setup`, `/settings`, `/`: clinic account sign-in/up (email+password),
  first-run setup (clinic name, doctors with prefix/room/start time, staff with
  PINs), settings to edit the same, root redirect.

### ClinicGate (owned by the Auth agent; used by reception, settings, doctor button)

```ts
// src/components/auth/ClinicGate.tsx
export interface ClinicSession { user: User; clinicId: string; clinic: Clinic }
export function ClinicGate(props: { children: (session: ClinicSession) => React.ReactNode }): JSX.Element
// Waits for auth + users/{uid} + clinic; shows a branded loading state; redirects to
// /login when signed out and /setup when the account has no clinic yet; shows a
// friendly "Firebase isn't configured" card (with the .env.local steps) when
// firebaseConfigured is false.
```

## Reception container (integration)

`src/app/reception/page.tsx` → `src/components/reception/ReceptionApp.tsx` (client):
- Gate with `ClinicGate` (auth → user profile → clinic); redirect to `/login` or `/setup`.
- Subscribe: clinic, doctors (active), staff, queue days, desk tickets for `useToday(tz)`.
- Build views with `buildClinicHeader` / `buildDoctorQueueView`; tick with `useNow(1000)`.
- Layout by width: `< 768px` Phone, `768–1279px` Tablet, `≥ 1280px` Laptop.
- Handlers call `src/lib/queue/actions.ts`; push each `UndoEntry` onto an undo slot
  shown by `UndoToast` for 5 s (countdown); Undo / Ctrl+Z calls `undo(entry)`.
  Surface write errors (`committed` rejections) as an error toast.
- Offline: `useConnectivity()` + `fromCache`; show `OfflineBanner` with elapsed time
  and the number of taps made while offline.
- Modals: AddWalkIn (→ `addWalkIn`, then build `IssuedSlip` with ahead count + ETA),
  PauseQueue (→ `pauseQueue` with WhatsApp outbox bodies via `pauseMessage`).
- Lock: `useIdleLock(clinic.lockAfterMin)`, lock state persisted in `localStorage`
  (so refresh stays locked); `PinLock` overlays the app; `staffId` from unlock feeds
  `DeskContext.staffId`. Lock button in Settings menu / `onLock`.
- TV → `window.open('/tv/{clinicId}')`; Poster → `/poster/{clinicId}`; Settings → `/settings`.

## Working rules for agents

1. **Only create/edit files you own** (listed in your brief). Foundation files are
   read-only. Never run `npm install` or change `package.json`.
2. Every reception layout gets a preview page under `src/app/preview/<name>/page.tsx`
   rendering it with fixtures at the artboard size, so it can be screenshotted.
3. Visual check loop: run your own dev server so you don't collide with others:
   `NEXT_DIST_DIR=.next-<you> npx next dev -p <yourPort>` (in the background), then
   `node /private/tmp/claude-501/-Users-saumyajain-workspaces-money-options/bde9adec-a630-49d6-a953-d41bf8b1c877/scratchpad/shot/snap.js http://localhost:<port>/preview/<name> <w> <h> <out.png>`
   and Read both your PNG and `design/reference/NN-*.png`. Iterate until they match.
   Kill your dev server when done. Write screenshots to the scratchpad, not the repo.
4. Type-check with `npx tsc --noEmit -p .` and only fix errors in *your* files
   (others are being written concurrently). Run `npx eslint <your files>`.
5. Final report: files written, what matches the artboard, deliberate deviations,
   and any gaps in foundation modules.
