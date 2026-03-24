import { useState } from 'react';
import { Users, UserCheck, UserX, Clock, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockDashboardStats, generateAttendanceRecords } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { format } from 'date-fns';

const statCards = [
  { key: 'presentToday', label: 'Present Today', icon: UserCheck, color: 'text-status-present', bg: 'bg-status-present-bg' },
  { key: 'absentToday', label: 'Absent Today', icon: UserX, color: 'text-status-absent', bg: 'bg-status-absent-bg' },
  { key: 'lateToday', label: 'Late Today', icon: Clock, color: 'text-status-late', bg: 'bg-status-late-bg' },
  { key: 'missingPunch', label: 'Missing Punch', icon: AlertCircle, color: 'text-status-missing', bg: 'bg-status-missing-bg' },
  { key: 'totalEmployees', label: 'Total Employees', icon: Users, color: 'text-primary', bg: 'bg-accent' },
  { key: 'onLeave', label: 'On Leave', icon: Calendar, color: 'text-muted-foreground', bg: 'bg-muted' },
];

export default function DashboardPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const stats = mockDashboardStats;
  const todayStr = format(today, 'yyyy-MM-dd');
  const allRecords = generateAttendanceRecords(selectedMonth);
  const todayRecords = allRecords.filter(r => r.date === todayStr).slice(0, 8);

  const attendanceRate = Math.round((stats.presentToday / stats.totalEmployees) * 100);

  return (
    <AppLayout title="Dashboard" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="space-y-5">
        {/* Welcome */}
        <div>
          <h2 className="text-lg font-semibold">Good morning, HR Admin 👋</h2>
          <p className="text-sm text-muted-foreground">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ key, label, icon: Icon, color, bg }) => (
            <Card key={key} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-2xl font-bold">{stats[key as keyof typeof stats]}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attendance Rate */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Today's Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-primary">{attendanceRate}%</span>
                  <span className="text-sm text-muted-foreground pb-1">attendance</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-status-present" />
                    <span className="text-muted-foreground">Present: {stats.presentToday}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-status-absent" />
                    <span className="text-muted-foreground">Absent: {stats.absentToday}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-status-late" />
                    <span className="text-muted-foreground">Late: {stats.lateToday}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-status-missing" />
                    <span className="text-muted-foreground">Missing: {stats.missingPunch}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats donut */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Department Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {[
                  { dept: 'Engineering', present: 24, total: 26 },
                  { dept: 'Sales', present: 18, total: 20 },
                  { dept: 'Finance', present: 12, total: 14 },
                  { dept: 'HR', present: 8, total: 9 },
                  { dept: 'Operations', present: 25, total: 27 },
                ].map(({ dept, present, total }) => (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{dept}</span>
                      <span className="font-medium">{present}/{total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${(present / total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's exceptions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Today's Exceptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayRecords.filter(r => ['Absent', 'Late', 'Missing Punch'].includes(r.status)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No exceptions today 🎉</p>
              ) : (
                <div className="space-y-1.5">
                  {todayRecords
                    .filter(r => ['Absent', 'Late', 'Missing Punch'].includes(r.status))
                    .slice(0, 6)
                    .map((r) => (
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

        {/* Recent attendance */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Today's Attendance Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {todayRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No records for today yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
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
                    {todayRecords.map(r => (
                      <tr key={r.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2">
                          <p className="font-medium">{r.employeeName}</p>
                          <p className="text-muted-foreground">{r.employeeCode}</p>
                        </td>
                        <td className="py-2 text-muted-foreground">{r.department}</td>
                        <td className="py-2 font-mono">{r.inTime || '—'}</td>
                        <td className="py-2 font-mono">{r.outTime || '—'}</td>
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
