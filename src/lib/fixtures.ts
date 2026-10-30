/**
 * Sample data copied verbatim from design/Clinic Queue Brand.html. Used only
 * by the dev-only /preview routes so each layout can be compared side by side
 * with design/reference/*.png. Never imported by production pages.
 */
import type { QueueRowView } from "@/lib/queue/logic";
import type { ClinicHeaderView, DoctorQueueView, DoctorTabView } from "@/lib/view";

type RowSeed = Partial<QueueRowView> & Pick<QueueRowView, "label" | "name">;

function row(seed: RowSeed): QueueRowView {
  const visitType = seed.visitType ?? "new";
  const distance = seed.distance ?? "here";
  const isWalkIn = seed.isWalkIn ?? false;
  const labels = { here: "Here", under_15: "Under 15 min", "15_30": "15 to 30 min", over_30: "Over 30 min" } as const;
  const compact = { here: "Here", under_15: "Under 15", "15_30": "15 to 30", over_30: "Over 30" } as const;
  return {
    id: seed.label,
    displayName: isWalkIn ? `Walk-in: ${seed.name}` : seed.name,
    phoneMasked: null,
    isWalkIn,
    visitType,
    visitTypeLabel: visitType === "follow_up" ? "Follow-up" : visitType === "emergency" ? "Emergency" : "New",
    distance,
    distanceLabel: labels[distance],
    distanceLabelCompact: compact[distance],
    priority: false,
    noReplyElapsed: null,
    waitedLabel: "0 min",
    longWait: false,
    tone: seed.priority ? "priority" : seed.noReplyElapsed ? "noReply" : "normal",
    pending: false,
    ...seed,
  };
}

export const designHeader: ClinicHeaderView = {
  clinicName: "Sharma Family Clinic",
  dateLabel: "Thu, 29 Oct",
  session: "Morning",
  stats: { inQueue: 14, served: 31, avgConsult: "5.8 min", avgConsultIsDefault: false, avgWait: "22 min" },
};

export const designHeaderEmpty: ClinicHeaderView = {
  ...designHeader,
  stats: { inQueue: 0, served: 0, avgConsult: "6 min", avgConsultIsDefault: true, avgWait: null },
};

const sharmaTab: DoctorTabView = {
  id: "anita",
  prefix: "A",
  name: "Dr. Anita Sharma",
  room: "Room 2",
  waitingCount: 9,
  startsAtLabel: null,
  paused: false,
};

const vermaTab: DoctorTabView = {
  id: "rohit",
  prefix: "B",
  name: "Dr. Rohit Verma",
  room: "Room 3",
  waitingCount: 5,
  startsAtLabel: null,
  paused: false,
};

export const sharmaQueue: DoctorQueueView = {
  doctor: sharmaTab,
  serving: {
    ticketId: "A-18",
    label: "A-18",
    name: "Anil Choudhary",
    phoneMasked: "98290 •••65",
    visitTypeLabel: "Follow-up",
    inRoom: "6:12",
    consultMin: 6,
    pending: false,
  },
  nextUp: { ticketId: "A-26", label: "A-26", name: "Baby Arjun", priority: true },
  rows: [
    row({ label: "A-26", name: "Baby Arjun", phoneMasked: "99280 •••12", waitedLabel: "3 min", priority: true }),
    row({
      label: "A-19",
      name: "Ramesh Kumar",
      phoneMasked: "98281 •••34",
      waitedLabel: "38 min",
      longWait: true,
      noReplyElapsed: "1:40",
    }),
    row({ label: "A-20", name: "Sunita Devi", phoneMasked: "94140 •••07", visitType: "follow_up", waitedLabel: "34 min", longWait: true }),
    row({ label: "A-21", name: "Mohd. Irfan", phoneMasked: "70140 •••88", distance: "under_15", waitedLabel: "29 min" }),
    row({ label: "A-22", name: "Kavya Joshi", phoneMasked: "98870 •••51", visitType: "follow_up", waitedLabel: "25 min" }),
    row({ label: "A-23", name: "Priya Meena", phoneMasked: "98290 •••45", visitType: "follow_up", distance: "under_15", waitedLabel: "22 min" }),
    row({ label: "A-24", name: "Harish Saini", phoneMasked: "90010 •••63", distance: "15_30", waitedLabel: "18 min" }),
    row({ label: "A-25", name: "Kamla Bai", isWalkIn: true, waitedLabel: "12 min" }),
  ],
  nextTokenLabel: "A-27",
  lastToken: 26,
  paused: null,
  doctorButtonLinked: true,
};

export const vermaQueue: DoctorQueueView = {
  doctor: vermaTab,
  serving: {
    ticketId: "B-07",
    label: "B-07",
    name: "Baby Ishita",
    phoneMasked: "98760 •••11",
    visitTypeLabel: "New",
    inRoom: "4:40",
    consultMin: 5,
    pending: false,
  },
  nextUp: { ticketId: "B-08", label: "B-08", name: "Aarav Jain", priority: false },
  rows: [
    row({ label: "B-08", name: "Aarav Jain", phoneMasked: "98290 •••20", visitType: "follow_up", waitedLabel: "21 min" }),
    row({ label: "B-09", name: "Myra Khan", phoneMasked: "78910 •••02", waitedLabel: "17 min" }),
    row({ label: "B-10", name: "Vihaan Rao", phoneMasked: "99500 •••77", distance: "under_15", waitedLabel: "11 min" }),
    row({ label: "B-11", name: "Anaya Gupta", phoneMasked: "94600 •••39", visitType: "follow_up", distance: "15_30", waitedLabel: "6 min" }),
    row({ label: "B-12", name: "Kabir Singh", phoneMasked: "90240 •••58", waitedLabel: "2 min" }),
  ],
  nextTokenLabel: "B-13",
  lastToken: 12,
  paused: null,
  doctorButtonLinked: true,
};

/** Laptop screen: A-25 shows as "Kamla Bai · walk-in" there, not "Walk-in: Kamla Bai". */
export const designDoctors: DoctorQueueView[] = [sharmaQueue, vermaQueue];

/** Start of day: nothing issued yet; Dr. Verma starts later. */
export const startOfDayQueues: DoctorQueueView[] = [
  {
    doctor: { ...sharmaTab, waitingCount: 0 },
    serving: null,
    nextUp: null,
    rows: [],
    nextTokenLabel: "A-01",
    lastToken: 0,
    paused: null,
    doctorButtonLinked: false,
  },
  {
    doctor: { ...vermaTab, waitingCount: 0, startsAtLabel: "Starts 11:00 AM" },
    serving: null,
    nextUp: null,
    rows: [],
    nextTokenLabel: "B-01",
    lastToken: 0,
    paused: null,
    doctorButtonLinked: false,
  },
];

/** Offline screen: A-20 called while offline, A-21 moved back 2 while offline. */
export const offlineQueue: DoctorQueueView = {
  ...sharmaQueue,
  doctor: { ...sharmaTab, waitingCount: 7 },
  serving: {
    ticketId: "A-20",
    label: "A-20",
    name: "Sunita Devi",
    phoneMasked: "94140 •••07",
    visitTypeLabel: "Follow-up",
    inRoom: "0:48",
    consultMin: 1,
    pending: true,
  },
  nextUp: { ticketId: "A-19", label: "A-19", name: "Ramesh Kumar", priority: false },
  rows: [
    row({ label: "A-19", name: "Ramesh Kumar", phoneMasked: "98281 •••34", waitedLabel: "40 min", longWait: true, noReplyElapsed: "3:00" }),
    row({ label: "A-21", name: "Mohd. Irfan", phoneMasked: "70140 •••88", distance: "under_15", waitedLabel: "31 min", longWait: true, pending: true }),
    row({ label: "A-22", name: "Kavya Joshi", phoneMasked: "98870 •••51", visitType: "follow_up", waitedLabel: "27 min" }),
    row({ label: "A-23", name: "Priya Meena", phoneMasked: "98290 •••45", visitType: "follow_up", distance: "under_15", waitedLabel: "24 min" }),
    row({ label: "A-24", name: "Harish Saini", phoneMasked: "90010 •••63", distance: "15_30", waitedLabel: "20 min" }),
  ],
};

/** Phone screen: a one-doctor clinic. */
export const phoneHeader: ClinicHeaderView = {
  clinicName: "Dr. Mehta's Clinic",
  dateLabel: "Thu, 29 Oct",
  session: "Morning",
  stats: { inQueue: 8, served: 24, avgConsult: "6 min", avgConsultIsDefault: false, avgWait: "18 min" },
};

export const phoneQueue: DoctorQueueView = {
  doctor: { id: "mehta", prefix: "A", name: "Dr. Mehta", room: "Room 1", waitingCount: 8, startsAtLabel: null, paused: false },
  serving: {
    ticketId: "A-31",
    label: "A-31",
    name: "Geeta Sharma",
    phoneMasked: "98290 •••31",
    visitTypeLabel: "New",
    inRoom: "4:05",
    consultMin: 4,
    pending: false,
  },
  nextUp: { ticketId: "A-32", label: "A-32", name: "Rajat Bansal", priority: false },
  rows: [
    row({ label: "A-32", name: "Rajat Bansal", waitedLabel: "31 min", longWait: true }),
    row({ label: "A-33", name: "Pooja Agarwal", visitType: "follow_up", distance: "under_15", waitedLabel: "27 min" }),
    row({ label: "A-34", name: "Dinesh Yadav", waitedLabel: "22 min" }),
    row({ label: "A-35", name: "Shanti", isWalkIn: true, waitedLabel: "15 min" }),
    row({ label: "A-36", name: "Nikhil Jain", visitType: "follow_up", distance: "15_30", waitedLabel: "9 min" }),
  ],
  nextTokenLabel: "A-37",
  lastToken: 36,
  paused: null,
  doctorButtonLinked: false,
};

export const designStaff = [
  { id: "rekha", name: "Rekha", initials: "RK" },
  { id: "suresh", name: "Suresh", initials: "SM" },
];
