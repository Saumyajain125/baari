#!/usr/bin/env node
/**
 * Seeds the local Firebase emulators with the clinic from the design file:
 * Sharma Family Clinic, Dr. Anita Sharma and Dr. Rohit Verma, desk staff
 * Rekha and Suresh, and today's queue exactly as the "Reception: live queue"
 * artboard shows it (A-18 with the doctor, A-26 priority, A-19 called with no
 * reply, B-07 with Dr. Verma), plus the morning's finished consults so the
 * header stats look real.
 *
 *   npx firebase emulators:start        # terminal 1 (needs Java 11+)
 *   node scripts/seed.mjs               # terminal 2
 *   node scripts/seed.mjs --dry-run     # print what would be written, touch nothing
 *
 * It signs in as the clinic owner with the Firebase client SDK, so every write
 * goes through firestore.rules exactly like the app's own writes. It only ever
 * talks to the emulators. Re-running on the same day refreshes today's demo
 * tickets in place; restart the emulators for a completely clean slate.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, terminate, writeBatch } from "firebase/firestore";

/* ------------------------------------------------------------------ config */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Same precedence as Next.js: real env vars, then .env.local, then .env. */
function loadEnvFile(name) {
  const file = join(root, name);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const env = process.env;
const PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-baari";
const API_KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key";
// Hostname only: src/lib/firebase.ts always uses port 8080 for Firestore.
const FIRESTORE_HOST = env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "127.0.0.1";
const FIRESTORE_PORT = 8080;
const AUTH_URL = env.NEXT_PUBLIC_AUTH_EMULATOR_URL || "http://127.0.0.1:9099";
const APP_URL = env.APP_URL || "http://localhost:3000";

const OWNER = { email: "owner@demo.clinic", password: "password123" };
const CLINIC_ID = "sharma-family-clinic";
const CLINIC = { name: "Sharma Family Clinic", timezone: "Asia/Kolkata", defaultConsultMin: 6, lockAfterMin: 10 };

const DOCTORS = [
  { id: "anita", name: "Dr. Anita Sharma", prefix: "A", room: "Room 2", startsAt: null },
  { id: "rohit", name: "Dr. Rohit Verma", prefix: "B", room: "Room 3", startsAt: null },
];

/** Initials as drawn on the PIN lock artboard. */
const STAFF = [
  { id: "rekha", name: "Rekha", initials: "RK", pin: "1234" },
  { id: "suresh", name: "Suresh", initials: "SM", pin: "5678" },
];

/** Staff id stamped on the desk's changes ("updatedBy"). */
const DESK = "rekha";
/** `updatedBy` for tickets a patient created by QR and nobody has touched since. */
const PATIENT = "patient";

/**
 * Today's queue per doctor, in token order. Times are relative to the moment
 * the seed runs, so the desk shows the artboard's numbers right after seeding.
 *   earlier: seen today (`consult` min with the doctor, `wait` min from joining
 *            to being called) or `noShow`
 *   serving: with the doctor for `inRoomSec`, called after `wait` min
 *   waiting: joined `waited` min ago; `noReplySec` = called that long ago, didn't come in
 * Average consult works out at 5.8 min and average wait at 22 min.
 */
const PLAN = {
  anita: {
    earlier: [
      { name: "Gopal Das", phone: null, source: "walk_in", visitType: "new", consult: 5.5, wait: 10 },
      { name: "Meena Kumari", phone: "9461023418", source: "qr", visitType: "follow_up", consult: 6.5, wait: 14 },
      { name: "Rahul Saxena", phone: "9783045126", source: "qr", visitType: "new", consult: 4.8, wait: 17 },
      { name: "Farida Begum", phone: "8875012964", source: "walk_in", visitType: "follow_up", consult: 7.0, wait: 19 },
      { name: "Vikram Singh", phone: "9414567210", source: "qr", visitType: "new", consult: 5.2, wait: 21 },
      { name: "Lata Sharma", phone: "9829134507", source: "qr", visitType: "follow_up", consult: 6.1, wait: 23 },
      { name: "Deepak Mathur", phone: null, source: "walk_in", visitType: "new", consult: 5.9, wait: 24 },
      { name: "Asha Rani", phone: "9001276540", source: "qr", visitType: "new", consult: 4.6, wait: 25 },
      { name: "Naveen Kumar", phone: "9772013658", source: "qr", visitType: "new", noShow: true },
      { name: "Sushila Devi", phone: null, source: "walk_in", visitType: "follow_up", consult: 6.8, wait: 26 },
      { name: "Arjun Mehra", phone: "9887120345", source: "qr", visitType: "new", consult: 5.4, wait: 27 },
      { name: "Pooja Rathore", phone: "9928076413", source: "qr", visitType: "follow_up", consult: 6.2, wait: 28 },
      { name: "Imran Khan", phone: "7014298730", source: "qr", visitType: "new", consult: 5.0, wait: 29 },
      { name: "Neelam Gupta", phone: "9460351278", source: "walk_in", visitType: "follow_up", consult: 7.3, wait: 30 },
      { name: "Sanjay Purohit", phone: "9829250916", source: "qr", visitType: "new", consult: 5.7, wait: 31 },
      { name: "Kiran Bhatt", phone: "9636014782", source: "qr", visitType: "follow_up", consult: 6.4, wait: 32 },
      { name: "Manoj Tiwari", phone: null, source: "walk_in", visitType: "new", consult: 5.3, wait: 33 },
    ],
    serving: { name: "Anil Choudhary", phone: "9829041765", source: "qr", visitType: "follow_up", inRoomSec: 372, wait: 33 },
    waiting: [
      { name: "Ramesh Kumar", phone: "9828167234", visitType: "new", distance: "here", waited: 38, noReplySec: 100 },
      { name: "Sunita Devi", phone: "9414023107", visitType: "follow_up", distance: "here", waited: 34 },
      { name: "Mohd. Irfan", phone: "7014056988", visitType: "new", distance: "under_15", waited: 29 },
      { name: "Kavya Joshi", phone: "9887034551", visitType: "follow_up", distance: "here", waited: 25 },
      { name: "Priya Meena", phone: "9829078145", visitType: "follow_up", distance: "under_15", waited: 22 },
      { name: "Harish Saini", phone: "9001029863", visitType: "new", distance: "15_30", waited: 18 },
      { name: "Kamla Bai", phone: null, source: "walk_in", visitType: "new", distance: "here", waited: 12 },
      // Joined last but marked priority at the desk, so the artboard lists her first.
      { name: "Baby Arjun", phone: "9928054312", visitType: "new", distance: "here", waited: 3, priority: true },
    ],
  },
  rohit: {
    earlier: [
      { name: "Baby Riya", phone: "9829307215", source: "qr", visitType: "new", consult: 6.0, wait: 8 },
      { name: "Aditya Kapoor", phone: null, source: "walk_in", visitType: "follow_up", consult: 5.1, wait: 12 },
      { name: "Sneha Chauhan", phone: "9414870236", source: "qr", visitType: "new", consult: 6.6, wait: 15 },
      { name: "Master Yash", phone: "9983012457", source: "qr", visitType: "new", consult: 5.5, wait: 18 },
      { name: "Fatima Shaikh", phone: "7340126589", source: "walk_in", visitType: "follow_up", consult: 4.9, wait: 20 },
      { name: "Rohan Agarwal", phone: "9166023874", source: "qr", visitType: "new", consult: 6.3, wait: 21 },
    ],
    serving: { name: "Baby Ishita", phone: "9876045211", source: "qr", visitType: "new", inRoomSec: 280, wait: 19 },
    waiting: [
      { name: "Aarav Jain", phone: "9829063420", visitType: "follow_up", distance: "here", waited: 21 },
      { name: "Myra Khan", phone: "7891047302", visitType: "new", distance: "here", waited: 17 },
      { name: "Vihaan Rao", phone: "9950012877", visitType: "new", distance: "under_15", waited: 11 },
      { name: "Anaya Gupta", phone: "9460087139", visitType: "follow_up", distance: "15_30", waited: 6 },
      { name: "Kabir Singh", phone: "9024036558", visitType: "new", distance: "here", waited: 2 },
    ],
  },
};

/* ------------------------------------------------------- app rules, mirrored */
// The app's helpers are TypeScript; these copies must stay in step with them.

const MIN = 60_000;
/** src/lib/queue/logic.ts POSITION_STEP */
const POSITION_STEP = 1000;

const paths = {
  user: (uid) => `users/${uid}`,
  clinic: (c) => `clinics/${c}`,
  member: (c, uid) => `clinics/${c}/members/${uid}`,
  doctor: (c, id) => `clinics/${c}/doctors/${id}`,
  staffMember: (c, id) => `clinics/${c}/staff/${id}`,
  queue: (c, doctorId, date) => `clinics/${c}/queues/${doctorId}_${date}`,
  ticket: (c, id) => `clinics/${c}/tickets/${id}`,
  ticketPrivate: (c, id) => `clinics/${c}/ticketPrivate/${id}`,
};

/** src/lib/time.ts dateKey(): clinic-local "YYYY-MM-DD". */
function dateKey(ms, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** src/lib/queue/logic.ts tokenLabel() */
function tokenLabel(prefix, token) {
  return `${prefix}-${String(token).padStart(2, "0")}`;
}

/** src/lib/pin.ts newSalt(): 16 random bytes as hex. */
function newSalt() {
  return randomBytes(16).toString("hex");
}

/** src/lib/pin.ts hashPin(): hex(SHA-256(utf8(salt + ":" + pin))). */
function hashPin(pin, salt) {
  return createHash("sha256").update(`${salt}:${pin}`, "utf8").digest("hex");
}

/** src/lib/queue/logic.ts maskPhone(), for the dry-run listing. */
function maskPhone(phone) {
  return phone ? `${phone.slice(0, 5)} •••${phone.slice(-2)}` : "no phone";
}

/* ---------------------------------------------------------------- the day */

/** Every Ticket field (src/lib/types.ts), with a fresh waiting ticket's defaults. */
function ticketFields(doctor, date, token, fields) {
  return {
    clinicId: CLINIC_ID,
    doctorId: doctor.id,
    date,
    token,
    label: tokenLabel(doctor.prefix, token),
    status: "waiting",
    position: token * POSITION_STEP,
    priority: false,
    visitType: "new",
    distance: "here",
    source: "qr",
    createdAt: 0,
    calledAt: null,
    lastCallAt: null,
    callCount: 0,
    noReplyAt: null,
    finishedAt: null,
    consultMs: null,
    updatedBy: PATIENT,
    updatedAt: 0,
    ...fields,
  };
}

/**
 * Turns one doctor's PLAN into Firestore docs. The timeline is built backwards
 * from the patient in the room: each earlier consult ended the moment the next
 * patient was called, which is what "Next patient" records.
 */
function buildDay(doctor, plan, date, now) {
  const tickets = [];
  const add = (token, entry, fields) => {
    const ticket = ticketFields(doctor, date, token, fields);
    const id = `seed-${date}-${ticket.label}`;
    tickets.push({
      id,
      ticket,
      priv: { clinicId: CLINIC_ID, date, name: entry.name, phone: entry.phone, patientUid: null },
    });
  };

  // Earlier patients, newest first, so each one finishes when the next was called.
  const servingCalledAt = now - plan.serving.inRoomSec * 1000;
  const timing = new Array(plan.earlier.length);
  let nextCalledAt = servingCalledAt;
  for (let i = plan.earlier.length - 1; i >= 0; i--) {
    const e = plan.earlier[i];
    if (e.noShow) continue;
    const consultMs = Math.round(e.consult * MIN);
    const calledAt = nextCalledAt - consultMs;
    timing[i] = { createdAt: calledAt - e.wait * MIN, calledAt, finishedAt: nextCalledAt, consultMs };
    nextCalledAt = calledAt;
  }

  plan.earlier.forEach((e, i) => {
    const token = i + 1;
    const base = { visitType: e.visitType, source: e.source, updatedBy: DESK };
    if (e.noShow) {
      // Joined between their neighbours; marked no-show just before the next patient was called.
      const createdAt = Math.round((timing[i - 1].createdAt + timing[i + 1].createdAt) / 2);
      const finishedAt = timing[i + 1].calledAt - 30_000;
      add(token, e, { ...base, status: "no_show", createdAt, finishedAt, updatedAt: finishedAt });
      return;
    }
    const t = timing[i];
    add(token, e, {
      ...base,
      status: "done",
      createdAt: t.createdAt,
      calledAt: t.calledAt,
      lastCallAt: t.calledAt,
      callCount: 1,
      finishedAt: t.finishedAt,
      consultMs: t.consultMs,
      updatedAt: t.finishedAt,
    });
  });

  const servingToken = plan.earlier.length + 1;
  const s = plan.serving;
  add(servingToken, s, {
    status: "serving",
    visitType: s.visitType,
    source: s.source,
    createdAt: servingCalledAt - s.wait * MIN,
    calledAt: servingCalledAt,
    lastCallAt: servingCalledAt,
    callCount: 1,
    updatedBy: DESK,
    updatedAt: servingCalledAt,
  });

  plan.waiting.forEach((w, i) => {
    // A few seconds' slack so "38 min" still reads 38 min when the desk opens.
    const createdAt = now - w.waited * MIN - 5_000;
    const fields = {
      visitType: w.visitType,
      distance: w.distance,
      source: w.source ?? "qr",
      createdAt,
      updatedBy: w.source === "walk_in" ? DESK : PATIENT,
      updatedAt: createdAt,
    };
    if (w.noReplySec) {
      // Called, didn't come in, sent back by "Not here".
      const calledAt = now - w.noReplySec * 1000;
      Object.assign(fields, { lastCallAt: calledAt, callCount: 1, noReplyAt: calledAt, updatedBy: DESK, updatedAt: calledAt + 1_000 });
    }
    if (w.priority) Object.assign(fields, { priority: true, updatedBy: DESK, updatedAt: createdAt + MIN });
    add(servingToken + 1 + i, w, fields);
  });

  const queue = {
    clinicId: CLINIC_ID,
    doctorId: doctor.id,
    date,
    lastToken: tickets.length,
    paused: null,
    // Fresh heartbeat: the desk shows "Doctor's button linked" (for 90 s, or
    // for as long as /doctor/... is open on another device).
    doctorButtonSeenAt: now,
  };
  return { doctor, date, queue, tickets };
}

/** Sanity checks so a bad edit to PLAN fails here, not in the rules. */
function check(days) {
  for (const day of days) {
    let lastCreated = -Infinity;
    for (const { ticket, priv } of day.tickets) {
      if (priv.phone !== null && !/^[6-9]\d{9}$/.test(priv.phone)) throw new Error(`${ticket.label}: bad phone ${priv.phone}`);
      if (ticket.createdAt <= lastCreated) throw new Error(`${ticket.label} joined before the token ahead of it`);
      lastCreated = ticket.createdAt;
    }
  }
}

/** The desk header's numbers (src/lib/queue/logic.ts computeStats + formatAvgMinutes). */
function stats(tickets) {
  const fmt = (min) => `${min < 10 ? Math.round(min * 10) / 10 : Math.round(min)} min`;
  const done = tickets.filter((t) => t.status === "done");
  const called = tickets.filter((t) => (t.status === "done" || t.status === "serving") && t.calledAt != null);
  const consult = done.filter((t) => t.consultMs > 0);
  return {
    inQueue: tickets.filter((t) => t.status === "waiting").length,
    served: done.length,
    avgConsult: fmt(consult.reduce((n, t) => n + t.consultMs, 0) / consult.length / MIN),
    avgWait: fmt(called.reduce((n, t) => n + (t.calledAt - t.createdAt), 0) / called.length / MIN),
  };
}

/** src/lib/queue/logic.ts compareWaiting */
function compareWaiting(a, b) {
  if (a.priority !== b.priority) return a.priority ? -1 : 1;
  if (a.position !== b.position) return a.position - b.position;
  return a.token - b.token;
}

function printDay(day, now) {
  const rows = day.tickets.map(({ ticket, priv }) => ({ ...ticket, ...priv }));
  const serving = rows.find((t) => t.status === "serving");
  const waiting = rows.filter((t) => t.status === "waiting").sort(compareWaiting);
  const finished = rows.filter((t) => t.status === "done" || t.status === "no_show");
  console.log(`\n${day.doctor.name} (${day.doctor.room}), lastToken ${day.queue.lastToken}`);
  console.log(`  ${finished.length} earlier (${finished.filter((t) => t.status === "no_show").length} no-show)`);
  if (serving) {
    const inRoom = Math.floor((now - serving.calledAt) / 1000);
    console.log(`  With doctor  ${serving.label}  ${serving.name}  ${maskPhone(serving.phone)}  ${Math.floor(inRoom / 60)}:${String(inRoom % 60).padStart(2, "0")} in room`);
  }
  for (const t of waiting) {
    const flags = [t.priority && "PRIORITY", t.noReplyAt && "called, no reply", t.source === "walk_in" && "walk-in"].filter(Boolean);
    console.log(
      `  Up next      ${t.label}  ${t.name.padEnd(14)} ${maskPhone(t.phone).padEnd(12)} ${t.visitType.padEnd(9)} ${t.distance.padEnd(8)} ${String(Math.floor((now - t.createdAt) / MIN)).padStart(2)} min  ${flags.join(", ")}`,
    );
  }
}

/* --------------------------------------------------------------- firebase */

function withTimeout(promise, what) {
  const ms = 20_000;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${what} timed out. Is the Firestore emulator running on ${FIRESTORE_HOST}:${FIRESTORE_PORT}?`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function signInOwner(auth) {
  try {
    return (await createUserWithEmailAndPassword(auth, OWNER.email, OWNER.password)).user;
  } catch (e) {
    if (e?.code === "auth/email-already-in-use") {
      return (await signInWithEmailAndPassword(auth, OWNER.email, OWNER.password)).user;
    }
    if (e?.code === "auth/network-request-failed") {
      throw new Error(`Can't reach the Auth emulator at ${AUTH_URL}. Start the emulators first: npx firebase emulators:start`);
    }
    throw e;
  }
}

/**
 * First-run setup, in one batch with the same shape as createClinicWithSetup()
 * in src/lib/clinic-admin.ts. Skipped when the clinic already exists, so the
 * seed can be re-run without touching the clinic's settings or staff.
 */
async function ensureClinic(db, uid, now) {
  const clinicRef = doc(db, paths.clinic(CLINIC_ID));
  const existing = await withTimeout(getDoc(clinicRef), "Reading the clinic");
  if (existing.exists()) {
    if (existing.data().ownerUid !== uid) throw new Error(`clinics/${CLINIC_ID} belongs to another account.`);
    console.log("Clinic already set up: keeping its settings, doctors and staff.");
    return;
  }

  const batch = writeBatch(db);
  batch.set(clinicRef, { ...CLINIC, ownerUid: uid, createdAt: now });
  batch.set(doc(db, paths.member(CLINIC_ID, uid)), { uid, role: "owner", addedAt: now });
  batch.set(doc(db, paths.user(uid)), { clinicId: CLINIC_ID });
  DOCTORS.forEach((d, order) => {
    batch.set(doc(db, paths.doctor(CLINIC_ID, d.id)), {
      name: d.name,
      prefix: d.prefix,
      room: d.room,
      startsAt: d.startsAt,
      order,
      active: true,
    });
  });
  STAFF.forEach((s, order) => {
    const pinSalt = newSalt();
    batch.set(doc(db, paths.staffMember(CLINIC_ID, s.id)), {
      name: s.name,
      initials: s.initials,
      pinHash: hashPin(s.pin, pinSalt),
      pinSalt,
      order,
    });
  });
  await withTimeout(batch.commit(), "Creating the clinic");
  console.log(`Created ${CLINIC.name} with ${DOCTORS.length} doctors and ${STAFF.length} staff.`);
}

/**
 * Rules may make at most 20 document reads per batch. Firestore caches repeat
 * reads of the members doc, but small batches don't depend on that.
 */
const WRITES_PER_BATCH = 20;

/** The queue day, then every ticket with its private doc. */
async function writeDay(db, day) {
  const writes = [[paths.queue(CLINIC_ID, day.doctor.id, day.date), day.queue]];
  for (const t of day.tickets) {
    writes.push([paths.ticket(CLINIC_ID, t.id), t.ticket], [paths.ticketPrivate(CLINIC_ID, t.id), t.priv]);
  }
  for (let i = 0; i < writes.length; i += WRITES_PER_BATCH) {
    const batch = writeBatch(db);
    for (const [path, data] of writes.slice(i, i + WRITES_PER_BATCH)) batch.set(doc(db, path), data);
    await withTimeout(batch.commit(), `Writing ${day.doctor.name}'s queue`);
  }
}

function buildDays(now) {
  const date = dateKey(now, CLINIC.timezone);
  const days = DOCTORS.map((d) => buildDay(d, PLAN[d.id], date, now));
  check(days);
  return { date, days };
}

function printSummary(date, days, now) {
  for (const day of days) printDay(day, now);
  const s = stats(days.flatMap((d) => d.tickets.map((t) => t.ticket)));
  console.log(`\nHeader: In queue ${s.inQueue} · Served today ${s.served} · Avg consult ${s.avgConsult} · Avg wait ${s.avgWait}`);
  console.log(`Date: ${date} (${CLINIC.timezone})`);
}

async function main() {
  if (process.argv.includes("--dry-run")) {
    const now = Date.now();
    const { date, days } = buildDays(now);
    printSummary(date, days, now);
    console.log("\nDry run: nothing written.");
    return;
  }

  if (!existsSync(join(root, ".env.local"))) {
    console.warn("Note: no .env.local yet. Copy .env.example to .env.local so the app reads from the emulators too.\n");
  } else if (env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "true") {
    console.warn("Note: .env.local doesn't set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true, so the app won't show this data.\n");
  }
  console.log(`Seeding project "${PROJECT_ID}" on the emulators (Auth ${AUTH_URL}, Firestore ${FIRESTORE_HOST}:${FIRESTORE_PORT})`);

  const app = initializeApp({ apiKey: API_KEY, projectId: PROJECT_ID, authDomain: `${PROJECT_ID}.firebaseapp.com` });
  const auth = getAuth(app);
  connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true });
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, FIRESTORE_HOST, FIRESTORE_PORT);

  try {
    const user = await signInOwner(auth);
    await ensureClinic(db, user.uid, Date.now());

    // Build the timeline only now, so the waits are exact when the data lands.
    const now = Date.now();
    const { date, days } = buildDays(now);
    for (const day of days) await writeDay(db, day);
    printSummary(date, days, now);
  } finally {
    await terminate(db);
  }

  const pins = STAFF.map((s) => `${s.name} ${s.pin}`).join(", ");
  console.log(`
Sign in      ${APP_URL}/login       ${OWNER.email} / ${OWNER.password}
Reception    ${APP_URL}/reception   PINs: ${pins}
TV display   ${APP_URL}/tv/${CLINIC_ID}
Join by QR   ${APP_URL}/q/${CLINIC_ID}
QR poster    ${APP_URL}/poster/${CLINIC_ID}
Doctor       ${APP_URL}/doctor/${CLINIC_ID}/${DOCTORS[0].id}
Emulator UI  http://127.0.0.1:4000`);
}

main().then(
  // The Auth SDK keeps timers alive; exit explicitly once everything is written.
  () => process.exit(0),
  (e) => {
    console.error(`\nSeed failed: ${e?.message ?? e}`);
    process.exit(1);
  },
);
