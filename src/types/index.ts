export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Missing Punch';
export type FinalizationStatus = 'Draft' | 'Finalized' | 'Locked';

export interface Employee {
  id: string;
  code: string;
  name: string;
  department: string;
  shift: string;
  active: boolean;
  email?: string;
  phone?: string;
  designation?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  date: string;
  inTime: string;
  outTime: string;
  workingHours: string;
  status: AttendanceStatus;
  isLate: boolean;
  shiftName: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'National' | 'Regional' | 'Optional';
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  paidLeave: boolean;
  maxDays: number;
}

export interface DashboardStats {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  missingPunch: number;
  totalEmployees: number;
  onLeave: number;
}
