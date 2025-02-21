export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfRegistration: string;
  paid: boolean;
  groupId: string;
  lessonsAttended: number;
}

export interface Group {
  id: string;
  name: string;
  feePerSession: number;
  description?: string;
  schedule: Schedule[];
}

export interface Payment {
  studentId: string;
  amount: number;
  date: string;
  month: string;
  year: string;
}

export interface Schedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  time: string;
  present: boolean;
  groupId: string;
}
