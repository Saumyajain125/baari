/**
 * Preview data for the public surfaces, continuing the design file's story
 * (Sharma Family Clinic, Thu 29 Oct, 10:51 AM). Used only by /preview routes.
 */
import { pauseMessage } from "@/components/reception/handlers";
import type { JoinDoctorOption, PatientStatusView, TvDoctorView, TvView } from "./views";

export const previewJoinUrl = "https://baari.app/q/sharma-family-clinic";

const sharmaTv: TvDoctorView = {
  id: "anita",
  prefix: "A",
  name: "Dr. Anita Sharma",
  room: "Room 2",
  nowCalling: "A-18",
  callKey: 1,
  next: ["A-26", "A-19", "A-20", "A-21", "A-22"],
  waitingCount: 9,
  pausedMessage: null,
  startsAtLabel: null,
};

const vermaTv: TvDoctorView = {
  id: "rohit",
  prefix: "B",
  name: "Dr. Rohit Verma",
  room: "Room 3",
  nowCalling: "B-07",
  callKey: 2,
  next: ["B-08", "B-09", "B-10", "B-11", "B-12"],
  waitingCount: 5,
  pausedMessage: null,
  startsAtLabel: null,
};

const guptaTv: TvDoctorView = {
  id: "meera",
  prefix: "C",
  name: "Dr. Meera Gupta",
  room: "Room 4",
  nowCalling: null,
  callKey: null,
  next: [],
  waitingCount: 0,
  pausedMessage: null,
  startsAtLabel: "Starts 11:00 AM",
};

const joshiTv: TvDoctorView = {
  id: "vikram",
  prefix: "D",
  name: "Dr. Vikram Joshi",
  room: "Room 5",
  nowCalling: "D-04",
  callKey: 4,
  next: ["D-05", "D-06"],
  waitingCount: 2,
  pausedMessage: null,
  startsAtLabel: null,
};

const tvBase: Omit<TvView, "doctors"> = {
  clinicName: "Sharma Family Clinic",
  dateLabel: "Thu, 29 Oct",
  clock: "10:51 AM",
};

/** `?doctors=1..4&paused=1` on /preview/tv picks one of these. */
export function previewTv(doctorCount: number, paused: boolean): TvView {
  const all = [sharmaTv, vermaTv, guptaTv, joshiTv].slice(0, Math.min(4, Math.max(1, doctorCount)));
  const doctors = paused
    ? all.map((d, i) => (i === 1 || all.length === 1 ? { ...d, pausedMessage: pauseMessage("Lunch", "1:30 PM") } : d))
    : all;
  return { ...tvBase, doctors };
}

export const previewJoinDoctors: JoinDoctorOption[] = [
  {
    id: "anita",
    prefix: "A",
    name: "Dr. Anita Sharma",
    room: "Room 2",
    waitingCount: 9,
    etaText: "approx 45 to 55 min",
    pausedNote: null,
    startsAtLabel: null,
  },
  {
    id: "rohit",
    prefix: "B",
    name: "Dr. Rohit Verma",
    room: "Room 3",
    waitingCount: 5,
    etaText: "approx 25 to 35 min",
    pausedNote: null,
    startsAtLabel: null,
  },
];

/** Priya Meena's phone: A-23, with A-26, A-19, A-20, A-21 and A-22 ahead. */
export const previewPatientWaiting: PatientStatusView = {
  clinicName: "Sharma Family Clinic",
  doctorName: "Dr. Anita Sharma",
  room: "Room 2",
  label: "A-23",
  name: "Priya Meena",
  phase: "waiting",
  leftByPatient: false,
  ahead: 5,
  etaText: "approx 25 to 30 min",
  nowServing: "A-18",
  pausedMessage: null,
  noReply: false,
  distance: "under_15",
  canEdit: true,
  callKey: null,
  dateLabel: "Thu, 29 Oct",
};

/** `?state=` on /preview/patient-status. */
export function previewPatient(state: string): PatientStatusView {
  switch (state) {
    case "turn":
      return { ...previewPatientWaiting, phase: "serving", ahead: null, etaText: null, nowServing: "A-23", callKey: 1 };
    case "paused":
      return { ...previewPatientWaiting, pausedMessage: pauseMessage("Lunch", "1:30 PM") };
    case "no-reply":
      return { ...previewPatientWaiting, noReply: true, ahead: 2, etaText: "approx 10 to 15 min", distance: "here" };
    case "next":
      return { ...previewPatientWaiting, ahead: 0, etaText: "You're next", nowServing: "A-22", distance: "here" };
    case "left":
      return { ...previewPatientWaiting, phase: "removed", leftByPatient: true, ahead: null, etaText: null };
    case "done":
      return { ...previewPatientWaiting, phase: "done", ahead: null, etaText: null };
    case "watch":
      return { ...previewPatientWaiting, name: null, canEdit: false };
    default:
      return previewPatientWaiting;
  }
}
