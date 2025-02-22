// index.ts

/**
 * The Student has a 'montant' field tracking how much they owe total 
 * across all unpaid sessions. We also keep 'lessonsAttended' for total 
 * sessions they've been present for.
 */
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfRegistration: string;

  // Whether they're fully paid or not (optional if you want a monthly concept)
  paid: boolean;

  // Which group they belong to
  groupId: string;

  // How many sessions they've attended total
  lessonsAttended: number;

  // How much money they owe total for unpaid sessions
  montant: number;
}

/**
 * The Group, with feePerSession
 */
export interface Group {
  id: string;
  name: string;
  feePerSession: number;
  description?: string;
  schedule: Schedule[];
}

export interface Schedule {
  day: 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday';
  time: string;
}

export interface Attendance {
  id?: string;
  studentId: string;
  groupId: string;

  // "YYYY-MM-DD"
  date: string;

  // e.g. "10:00"
  time: string;

  // whether they were present
  present: boolean;

  // whether that session is paid
  paid: boolean;

  createdAt?: any; 
  updatedAt?: any;
}

export interface PaymentHistory {
  id: string;
  studentId: string;
  groupId: string;
  sessionDate: string;
  sessionTime: string;
  amount: number;
  paidAt: string;
}
