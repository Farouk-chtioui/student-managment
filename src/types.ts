// index.ts

export interface Student {
    montant: number;
    balance: number;
    id: string;
    firstName: string;
    lastName: string;
    dateOfRegistration: string;
    paid: boolean;
    groupId: string;
    lessonsAttended: number;
  
    // We track how many sessions they've attended but haven't paid for yet
    unpaidSessions: number;
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
    paid: boolean;
    id: string;
    studentId: string;
    date: string;
    time: string;
    present: boolean;
    groupId: string;
  }
  
  export interface SessionPayment {
    id: string;
    studentId: string;
    groupId: string;
    sessionDate: string;
    sessionTime: string;
    amount: number;
    paid: boolean;
    paidAt?: string;
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
  