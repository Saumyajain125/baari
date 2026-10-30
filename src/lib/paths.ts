/** Firestore document paths. Keep every path string in this one file. */

export const paths = {
  user: (uid: string) => `users/${uid}`,
  clinic: (clinicId: string) => `clinics/${clinicId}`,
  members: (clinicId: string) => `clinics/${clinicId}/members`,
  member: (clinicId: string, uid: string) => `clinics/${clinicId}/members/${uid}`,
  doctors: (clinicId: string) => `clinics/${clinicId}/doctors`,
  doctor: (clinicId: string, doctorId: string) => `clinics/${clinicId}/doctors/${doctorId}`,
  staff: (clinicId: string) => `clinics/${clinicId}/staff`,
  staffMember: (clinicId: string, staffId: string) => `clinics/${clinicId}/staff/${staffId}`,
  queues: (clinicId: string) => `clinics/${clinicId}/queues`,
  queue: (clinicId: string, doctorId: string, date: string) => `clinics/${clinicId}/queues/${queueId(doctorId, date)}`,
  tickets: (clinicId: string) => `clinics/${clinicId}/tickets`,
  ticket: (clinicId: string, ticketId: string) => `clinics/${clinicId}/tickets/${ticketId}`,
  ticketPrivates: (clinicId: string) => `clinics/${clinicId}/ticketPrivate`,
  ticketPrivate: (clinicId: string, ticketId: string) => `clinics/${clinicId}/ticketPrivate/${ticketId}`,
  outbox: (clinicId: string) => `clinics/${clinicId}/outbox`,
};

export function queueId(doctorId: string, date: string): string {
  return `${doctorId}_${date}`;
}
