import { Employee, AttendanceRecord, Shift, Holiday, LeaveType, DashboardStats } from '@/types';

export const departments = ['Engineering', 'HR', 'Finance', 'Sales', 'Operations'];

export const mockEmployees: Employee[] = [
  { id: '1', code: 'EMP001', name: 'Arjun Sharma', department: 'Engineering', shift: 'General', active: true, email: 'arjun@company.com', designation: 'Senior Developer' },
  { id: '2', code: 'EMP002', name: 'Priya Patel', department: 'HR', shift: 'General', active: true, email: 'priya@company.com', designation: 'HR Manager' },
  { id: '3', code: 'EMP003', name: 'Rahul Verma', department: 'Finance', shift: 'Morning', active: true, email: 'rahul@company.com', designation: 'Accountant' },
  { id: '4', code: 'EMP004', name: 'Sunita Rao', department: 'Engineering', shift: 'General', active: true, email: 'sunita@company.com', designation: 'QA Engineer' },
  { id: '5', code: 'EMP005', name: 'Vikram Singh', department: 'Sales', shift: 'Morning', active: true, email: 'vikram@company.com', designation: 'Sales Manager' },
  { id: '6', code: 'EMP006', name: 'Anita Desai', department: 'Operations', shift: 'General', active: false, email: 'anita@company.com', designation: 'Operations Lead' },
  { id: '7', code: 'EMP007', name: 'Manish Kumar', department: 'Engineering', shift: 'Night', active: true, email: 'manish@company.com', designation: 'DevOps Engineer' },
  { id: '8', code: 'EMP008', name: 'Kavita Joshi', department: 'Finance', shift: 'General', active: true, email: 'kavita@company.com', designation: 'Finance Analyst' },
  { id: '9', code: 'EMP009', name: 'Deepak Nair', department: 'Sales', shift: 'General', active: true, email: 'deepak@company.com', designation: 'Sales Executive' },
  { id: '10', code: 'EMP010', name: 'Neha Gupta', department: 'HR', shift: 'Morning', active: true, email: 'neha@company.com', designation: 'Recruiter' },
  { id: '11', code: 'EMP011', name: 'Arun Mehta', department: 'Engineering', shift: 'General', active: true, email: 'arun@company.com', designation: 'Frontend Developer' },
  { id: '12', code: 'EMP012', name: 'Shalini Reddy', department: 'Operations', shift: 'Morning', active: true, email: 'shalini@company.com', designation: 'Operations Analyst' },
];

function randomStatus(): AttendanceRecord['status'] {
  const statuses: AttendanceRecord['status'][] = ['Present', 'Present', 'Present', 'Present', 'Absent', 'Late', 'Late', 'Half Day', 'Missing Punch'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function randomTime(base: string, variance: number): string {
  const [h, m] = base.split(':').map(Number);
  const offset = Math.floor(Math.random() * variance) - variance / 2;
  const totalMin = h * 60 + m + offset;
  const nh = Math.floor(totalMin / 60);
  const nm = Math.abs(totalMin % 60);
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function calcHours(inTime: string, outTime: string): string {
  if (!inTime || !outTime) return '0:00';
  const [ih, im] = inTime.split(':').map(Number);
  const [oh, om] = outTime.split(':').map(Number);
  const diff = (oh * 60 + om) - (ih * 60 + im);
  if (diff <= 0) return '0:00';
  return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}`;
}

export function generateAttendanceRecords(month: string): AttendanceRecord[] {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const records: AttendanceRecord[] = [];

  mockEmployees.forEach((emp) => {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(date).getDay();
      if (dow === 0 || dow === 6) return;

      const status = randomStatus();
      let inTime = '';
      let outTime = '';
      let isLate = false;

      if (status === 'Present') {
        inTime = randomTime('09:00', 30);
        outTime = randomTime('18:00', 30);
        const [ih, im] = inTime.split(':').map(Number);
        isLate = ih * 60 + im > 9 * 60 + 15;
      } else if (status === 'Late') {
        inTime = randomTime('10:00', 60);
        outTime = randomTime('18:00', 30);
        isLate = true;
      } else if (status === 'Half Day') {
        inTime = randomTime('09:00', 20);
        outTime = randomTime('13:00', 20);
      } else if (status === 'Missing Punch') {
        inTime = randomTime('09:00', 30);
        outTime = '';
      }

      records.push({
        id: `${emp.id}-${date}`,
        employeeCode: emp.code,
        employeeName: emp.name,
        department: emp.department,
        date,
        inTime,
        outTime,
        workingHours: calcHours(inTime, outTime),
        status,
        isLate,
        shiftName: emp.shift,
      });
    }
  });

  return records;
}

export const mockShifts: Shift[] = [
  { id: '1', name: 'General', startTime: '09:00', endTime: '18:00', graceMinutes: 15 },
  { id: '2', name: 'Morning', startTime: '07:00', endTime: '15:00', graceMinutes: 10 },
  { id: '3', name: 'Night', startTime: '22:00', endTime: '06:00', graceMinutes: 20 },
  { id: '4', name: 'Afternoon', startTime: '14:00', endTime: '22:00', graceMinutes: 15 },
];

export const mockHolidays: Holiday[] = [
  { id: '1', name: 'Republic Day', date: '2025-01-26', type: 'National' },
  { id: '2', name: 'Holi', date: '2025-03-14', type: 'National' },
  { id: '3', name: 'Good Friday', date: '2025-04-18', type: 'National' },
  { id: '4', name: 'Eid ul-Fitr', date: '2025-03-31', type: 'National' },
  { id: '5', name: 'Independence Day', date: '2025-08-15', type: 'National' },
  { id: '6', name: 'Gandhi Jayanti', date: '2025-10-02', type: 'National' },
  { id: '7', name: 'Diwali', date: '2025-10-20', type: 'National' },
  { id: '8', name: 'Christmas', date: '2025-12-25', type: 'National' },
];

export const mockLeaveTypes: LeaveType[] = [
  { id: '1', name: 'Casual Leave', code: 'CL', paidLeave: true, carryForward: false, paymentOnLapse: false, maxDays: 12 },
  { id: '2', name: 'Sick Leave', code: 'SL', paidLeave: true, carryForward: false, paymentOnLapse: false, maxDays: 10 },
  { id: '3', name: 'Earned Leave', code: 'EL', paidLeave: true, carryForward: true, paymentOnLapse: false, maxDays: 15 },
  { id: '4', name: 'Maternity Leave', code: 'ML', paidLeave: true, carryForward: false, paymentOnLapse: false, maxDays: 180 },
  { id: '5', name: 'Loss of Pay', code: 'LOP', paidLeave: false, carryForward: false, paymentOnLapse: false, maxDays: 0 },
  { id: '6', name: 'Compensatory Off', code: 'CO', paidLeave: true, carryForward: false, paymentOnLapse: true, maxDays: 5 },
];

export const mockDashboardStats: DashboardStats = {
  presentToday: 87,
  absentToday: 8,
  lateToday: 12,
  missingPunch: 5,
  totalEmployees: 112,
  onLeave: 6,
};
