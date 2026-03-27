import { useEffect, useMemo, useState } from 'react';
import { Users, UserCheck, UserX, Clock, AlertCircle, Calendar, Sparkles, ShieldCheck, Bolt } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { apiGet } from '@/lib/api';
import { getInitialMonth, persistMonth } from '@/lib/month';
import { AttendanceRecord, Employee } from '@/types';

const statCards = [
  { key: 'present', label: 'Present (Month)', icon: UserCheck, color: 'text-status-present', bg: 'bg-status-present-bg' },
  { key: 'absent', label: 'Absent (Month)', icon: UserX, color: 'text-status-absent', bg: 'bg-status-absent-bg' },
  { key: 'late', label: 'Late (Month)', icon: Clock, color: 'text-status-late', bg: 'bg-status-late-bg' },
  { key: 'missing', label: 'Missing Punch', icon: AlertCircle, color: 'text-status-missing', bg: 'bg-status-missing-bg' },
  { key: 'totalEmployees', label: 'Total Employees', icon: Users, color: 'text-primary', bg: 'bg-accent' },
  { key: 'onLeave', label: 'On Leave (Month)', icon: Calendar, color: 'text-muted-foreground', bg: 'bg-muted' },
];

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const monthLabel = useMemo(() => {
    const date = new Date(`${selectedMonth}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return selectedMonth;
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
  }, [selectedMonth]);

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    apiGet<AttendanceRecord[]>("/attendance", { month: selectedMonth, includeNonWorking: true })
      .then(setMonthRecords)
      .catch(() => setMonthRecords([]));
  }, [selectedMonth]);

  useEffect(() => {
    apiGet<Employee[]>("/employees")
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  const monthStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let missing = 0;
    let halfDay = 0;
    let leave = 0;

    for (const row of monthRecords) {
      if (row.status === 'Present') present += 1;
      else if (row.status === 'Absent') absent += 1;
      else if (row.status === 'Late') late += 1;
      else if (row.status === 'Missing Punch') missing += 1;
      else if (row.status === 'Half Day') halfDay += 1;
      else if (row.status === 'Leave') leave += 1;
    }

    const totalEmployees = employees.length;
    const totalRecords = monthRecords.length;
    const exceptions = absent + late + missing;
    const clean = Math.max(0, totalRecords - (absent + missing));
    const attendanceRate = totalRecords ? Math.round(((present + late + halfDay) / totalRecords) * 100) : 0;
    const salaryReadyRate = totalRecords ? Math.round((clean / totalRecords) * 100) : 0;

    return {
      present,
      absent,
      late,
      missing,
      halfDay,
      leave,
      totalEmployees,
      exceptions,
      attendanceRate,
      salaryReadyRate,
      totalRecords
    };
  }, [monthRecords, employees]);

  const monthExceptions = useMemo(
    () => monthRecords.filter(r => ['Absent', 'Late', 'Missing Punch'].includes(r.status)),
    [monthRecords]
  );

  const recentRecords = useMemo(() => monthRecords.slice(0, 8), [monthRecords]);

  return (
    <AppLayout title="Dashboard" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-[linear-gradient(120deg,#0b1220,#0f172a_45%,#1d4ed8)] text-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Monthly Attendance Overview</p>
              <h2 className="text-2xl font-semibold">Processed attendance for {monthLabel}</h2>
              <p className="text-sm text-white/70">Snapshot based on the selected month data.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Total Records</p>
                <p className="text-xl font-semibold">{monthStats.totalRecords}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Exceptions</p>
                <p className="text-xl font-semibold">{monthStats.exceptions}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Salary Ready</p>
                <p className="text-xl font-semibold">{monthStats.salaryReadyRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Monthly Attendance Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-5">
                <div
                  className="h-24 w-24 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(#22c55e ${monthStats.attendanceRate}%, #ef4444 0)`
                  }}
                >
                  <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center">
                    <span className="text-lg font-semibold">{monthStats.attendanceRate}%</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                    <span className="text-muted-foreground">Present</span>
                    <span className="font-semibold">{monthStats.present}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                    <span className="text-muted-foreground">Late</span>
                    <span className="font-semibold">{monthStats.late}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                    <span className="text-muted-foreground">Absent</span>
                    <span className="font-semibold">{monthStats.absent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
                    <span className="text-muted-foreground">Missing Punch</span>
                    <span className="font-semibold">{monthStats.missing}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Salary Readiness Meter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-emerald-600">{monthStats.salaryReadyRate}%</span>
                  <span className="text-xs text-muted-foreground pb-1">ready for payroll</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${monthStats.salaryReadyRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border px-3 py-2">
                    <p className="text-muted-foreground">Total Records</p>
                    <p className="font-semibold">{monthStats.totalRecords}</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2">
                    <p className="text-muted-foreground">Exceptions</p>
                    <p className="font-semibold">{monthStats.exceptions}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">We exclude absences and missing punches from salary-ready calculations.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bolt className="h-4 w-4 text-orange-500" />
                Monthly Exceptions Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthExceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No exceptions in this month</p>
              ) : (
                <div className="space-y-1.5">
                  {monthExceptions.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium">{r.employeeName}</p>
                        <p className="text-muted-foreground">{r.employeeCode}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ key, label, icon: Icon, color, bg }) => (
            <Card key={key} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-2xl font-bold">
                      {key === 'present' ? monthStats.present
                        : key === 'absent' ? monthStats.absent
                        : key === 'late' ? monthStats.late
                        : key === 'missing' ? monthStats.missing
                        : key === 'totalEmployees' ? monthStats.totalEmployees
                        : key === 'onLeave' ? monthStats.leave
                        : '--'}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Monthly Cleaned Punches</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No records for this month yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-max text-xs min-w-[640px] whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-semibold text-muted-foreground">Employee</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground">Department</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground">In Time</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground">Out Time</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map(r => (
                      <tr key={r.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2">
                          <p className="font-medium">{r.employeeName}</p>
                          <p className="text-muted-foreground">{r.employeeCode}</p>
                        </td>
                        <td className="py-2 text-muted-foreground">{r.department}</td>
                        <td className="py-2 font-mono">{r.inTime || '?'}</td>
                        <td className="py-2 font-mono">{r.outTime || '?'}</td>
                        <td className="py-2"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
