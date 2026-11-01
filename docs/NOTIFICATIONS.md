# Patient messages: findings and plan

**Status (2 Nov 2026): not built and not promised.** baari sends no WhatsApp, SMS or
call reminders, and no screen tells patients or reception that it will. This page
records what we found while looking into it, so the work can start from here later.

## What patients get today

- **In the waiting room:** the TV shows the called token (with an optional chime) and
  reception calls the patient out. No message is needed.
- **QR patients:** the live status page shows their place and an ETA, and buzzes and
  says "It's your turn" when they are called. It only does that while the page is
  open on screen: a locked phone or a closed tab won't buzz. That is the gap a
  reminder would fill, for patients who step out.
- **Mobile number:** still asked for on the QR join form and the walk-in form, marked
  "(optional)". It is stored only in the members-only `ticketPrivate` doc. The desk
  shows it masked ("98281 •••34") to tell patients apart; nothing dials or messages
  it. See [Open questions](#open-questions).

## What was taken out

Before this change the app promised WhatsApp updates that nothing delivered:

| Where | What it said | Now |
|-------|--------------|-----|
| Pause dialog (artboard 04) | "Also send a WhatsApp update to the 9 people waiting" checkbox, which wrote one `outbox` doc per waiting patient with a phone | Removed; pausing writes only the queue day |
| QR join form, walk-in form | Mobile "(optional, for WhatsApp updates)", placeholder "Leave empty if no smartphone" | "(optional)", placeholder "10-digit number" |
| Setup and Settings, clinic name hint | "...token slip and WhatsApp updates" | "...token slip and their phone" / "patients' phones" |
| Offline banner (artboard 07) | "WhatsApp alerts are on hold." | Removed |
| Landing page screenshot `public/landing/patient-join.webp` | Showed the WhatsApp label | Retaken from `/preview/join` |

The "your phone tells you when it's your turn" lines were softened too, because the
status page can only alert a patient while it is open:

| Where | Was | Now |
|-------|-----|-----|
| QR join form intro | "We'll show your place and tell you when it's your turn." | "Keep the page open to see your place and when it's your turn." |
| TV, beside the join QR | "Your phone shows your place and tells you when it's your turn." | "Keep the page open on your phone to see when it's your turn." |
| QR poster, step 3 | "Your phone tells you when it's your turn" / "बारी आने पर फ़ोन बताएगा" | "Keep the page open to see when it's your turn" / "पेज खुला रखें, बारी वहीं दिखेगी" |
| Landing page statement | "Their phone tells them when it's their turn." | "One look at their phone shows how near their turn is." |
| Landing page, how it works | "...and their phone tells them it's their turn." | "...and the page on their phone shows it's their turn." |

The landing page's poster (`poster.webp`), TV (`tv.webp`) and join screenshots were
retaken to match. Clinics that already printed the poster still have the old step 3;
reprinting it (desk settings menu > Print QR poster) picks up the new text.

The `outbox` collection's security rule is **kept**: a desk tab still running an older
build (or holding a pause it saved offline) would otherwise have its whole pause batch
refused once new rules are deployed. Nothing reads or sends those docs. The
`OutboxMessage` type and `paths.outbox` were removed from the code.

## Who the messages are for

Many patients don't have a reliable smartphone and aren't comfortable with apps, so:

- **Email is out.** Most of these patients don't have or check one.
- **WhatsApp can't be the only channel.** Good for those who have it, but it leaves out
  keypad phones and patients who rarely open it.
- **Most patients don't need a message at all.** Only patients who have stepped out
  do. The join form already asks how far away the patient is (`here`, `under_15`,
  `15_30`, `over_30`; walk-ins are `here`), so reminders can skip everyone marked
  `here`. That is likely the biggest cost saving.

## Channels, best first for these patients

| Channel | Works on | Rough cost per message | Notes |
|---------|----------|------------------------|-------|
| Nothing (TV, chime, desk calls out) | everyone in the room | free | Already built |
| "Call" button on the desk's queue row | any phone | free (clinic's own phone plan) | Not built. A `tel:` link; reception taps, the clinic phone rings the patient. Works for patients who can't read. |
| SMS | any phone, no data needed | about ₹0.15 to ₹0.25 (estimate, not checked) | India requires DLT registration (business, sender name, each message's wording); allow days to weeks |
| WhatsApp | phones with WhatsApp | ₹0.115 to ₹0.145 + 18% GST (utility template) | Meta-approved templates only, patient opt-in, sender quality rating, business verification for higher daily limits |
| Automated voice call (Hindi) | any phone, no reading needed | a few times the cost of an SMS (estimate) | Most reliable for low literacy; providers such as Exotel, Plivo, Twilio |
| Paper | everyone | free | Token slip can show the estimated time; a physio appointment card can be printed on the same slip printer |

WhatsApp figures were checked on 2 Nov 2026 against the sources below. They disagree
on whether utility messages sent within 24 hours of the patient messaging the clinic
became chargeable on 1 Oct 2026, so don't count on that window being free. SMS and
voice figures are ballpark only; get quotes before deciding.

## Cost against our pricing

At ₹0.14 to ₹0.17 per WhatsApp message (with GST), before any reseller markup:

| Clinic | Our revenue/month | 1 message per patient | 2 messages per patient |
|--------|-------------------|-----------------------|------------------------|
| 40 patients/day on ₹1/patient (1,040/month) | ₹1,040 | ₹141 to ₹178 (14 to 17%) | ₹283 to ₹356 (27 to 34%) |
| 80 patients/day on ₹999/month (2,080/month) | ₹999 | ₹283 to ₹356 (28 to 36%) | ₹566 to ₹711 (57 to 71%) |

These assume every patient gives a number; the phone is optional, so real costs are
lower. A pause also sends one message to every waiting patient with a phone. The busy
monthly-plan clinic is the risk: messaging should be capped, sold as an add-on, or
limited to one reminder per patient who has stepped out.

## How to build it, when it's time

**Where it runs.** A Cloud Function (2nd gen) in `asia-south1` next to Firestore,
using the Admin SDK. This needs the Firebase **Blaze** plan on `baari-queue`. Vercel
is a poor fit: it can't react to Firestore changes, so it would have to poll every
minute (a paid cron), adding up to a minute of delay.

**Reminders are decided on the server, not the desk.** If the desk wrote reminders the
way it used to write pause messages:

- several devices can press Next (tablet, laptop, the doctor's room button), so one
  patient could get several reminders;
- Undo can't recall a message, because browsers can't delete outbox docs;
- after an outage, everything saved offline syncs at once, so a patient already seen
  would be told "2 people ahead of you".

Instead, a function runs when a ticket becomes `serving`, reads that doctor's
**current** waiting order, and reminds each patient now within N places who is not
marked `here`, has a phone, and hasn't opted out. Each reminder gets a fixed id
(`{ticketId}_turn_soon`) and is created only if it doesn't exist, so it goes out once.
Reading current state means an offline backlog skips patients who were already seen.
Pause messages work the same way, from the queue day's `paused` field changing; wait
about a minute and send only if the queue is still paused, since a quick Resume is
the only way to take a pause back.

**One outbox for every channel, written by the server.** Each message names a channel
and a template rather than storing finished text, so any provider can be plugged in
later without touching the desk or the reminder logic:

```ts
{ clinicId, ticketId, kind: "turn_soon" | "pause" | "appointment",
  channel: "whatsapp" | "sms" | "voice", to: "9829012345",
  template: "turn_soon_v1", params: { clinic, token, ahead, link },
  status: "queued" | "sent" | "delivered" | "failed" | "skipped",
  attempts, providerId, error, createdAt, sentAt }
```

Until a provider is configured, the sender marks messages `skipped` and logs them, so
the reminder logic can be tested end to end without sending anything. Once the server
writes the outbox, the client `create` rule on `outbox` can be removed.

**Also needed:**

- A webhook (a Next.js route or an HTTPS function) for delivery receipts and replies.
  A STOP reply adds the number to an opt-out list that every send checks first.
- Consent: once messages exist, the join form says what the number is for; for
  walk-ins, reception asks, and the ticket records that the patient agreed.
- Retention: outbox docs hold phone numbers, so include them in the same expiry policy
  as `ticketPrivate` (see FIREBASE.md, Security notes).
- Templates in Meta's utility category (and the same wording registered for SMS under
  DLT), for example:
  - turn soon: "{{clinic}}: token {{token}}, {{ahead}} people ahead of you. Please come
    to the clinic now. Live status: {{link}}"
  - pause: "{{clinic}}: token {{token}}. The doctor is on a short break ({{reason}}),
    back around {{time}}. Your place is safe."
  - appointment (physio, the day before): "{{clinic}}: your appointment with
    {{doctor}} is tomorrow at {{time}}."

## Open questions

- Which channel first: SMS (reaches everyone), WhatsApp (richer, has the status link)
  or a Hindi voice call (no reading needed)? And who pays: an allowance inside each
  plan, or a paid add-on?
- Should the desk get the free "Call" button now? It is the cheapest reminder that
  works for every patient. The desk only shows the number masked today, so the button
  would dial the full number without displaying it.
- The reminder threshold: N places ahead, or N minutes of estimated wait?
- Future physio appointments would use the same outbox for day-before reminders.

## Sources

- [Meta: WhatsApp Business Platform pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [AiSensy: WhatsApp pricing update, October 2026](https://m.aisensy.com/blog/whatsapp-pricing-update-october-2026/)
- [AiSensy: per-message pricing from 1 January 2026](https://m.aisensy.com/blog/whatsapp-api-new-pricing/)
- [baat.ai: WhatsApp API costs in India (2026)](https://baat.ai/blog/whatsapp-api-pricing-india)
- [whautomate: WhatsApp API rates in India](https://whautomate.com/whatsapp-business-api-pricing-india)
- [SleekFlow: WhatsApp Business pricing](https://sleekflow.io/blog/whatsapp-business-price)
