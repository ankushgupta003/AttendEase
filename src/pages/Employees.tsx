import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Eye, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Employee, LeaveSummary } from '@/types';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { getInitialMonth, persistMonth } from '@/lib/month';

const defaultDepartments = ['Engineering', 'HR', 'Finance', 'Sales', 'Operations'];

export default function EmployeesPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [viewEmp, setViewEmp] = useState<Employee | null>(null);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [detailMonth, setDetailMonth] = useState(selectedMonth);
  const formatPeriodLabel = (monthStr: string, period: 'monthly' | 'quarterly' | 'yearly') => {
    const date = new Date(`${monthStr}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return monthStr;

    const year = date.getFullYear();
    if (period === 'yearly') return `${year}`;

    if (period === 'quarterly') {
      const monthIndex = date.getMonth(); // 0-based
      const quarter = Math.floor(monthIndex / 3) + 1;
      const startMonth = quarter * 3 - 3;
      const endMonth = startMonth + 2;
      const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' });
      const startName = monthFmt.format(new Date(year, startMonth, 1));
      const endName = monthFmt.format(new Date(year, endMonth, 1));
      return `Q${quarter} ${year} (${startName}-${endName})`;
    }

    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
    return monthName;
  };
  const fetchAttendanceSummary = async (empId: string, month: string, period: 'monthly' | 'quarterly' | 'yearly') => {
    setLoadingAttendance(true);
    try {
      const attendance = await apiGet<any>(`/employees/${empId}/attendance-summary`, { month, period });
      setAttendanceData(attendance);
    } catch {
      setAttendanceData(null);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    apiGet<Employee[]>("/employees").then(setEmployees).catch(() => setEmployees([]));
    apiGet<{ name: string }[]>("/shifts")
      .then((rows) => setShifts(rows.map((row) => row.name)))
      .catch(() => setShifts([]));
  }, []);

  const departments = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);
    return unique.length ? unique : defaultDepartments;
  }, [employees]);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.code.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (emp: Employee) => { setEditEmp({ ...emp }); setIsNew(false); };
  const openDetails = async (emp: Employee) => {
    setViewEmp(emp);
    setDetailMonth(selectedMonth);
    setDetailPeriod('monthly');
    
    // Fetch leave summary
    setLoadingSummary(true);
    try {
      const summary = await apiGet<LeaveSummary>(`/employees/${emp.id}/leave-summary`, { year: Number(selectedMonth.split('-')[0]), period: 'annual' });
      setLeaveSummary(summary);
    } catch {
      setLeaveSummary(null);
    } finally {
      setLoadingSummary(false);
    }

    // Fetch attendance summary (default to the selected month)
    await fetchAttendanceSummary(emp.id, selectedMonth, 'monthly');
  };
  const openNew = () => {
    setEditEmp({
      id: String(Date.now()),
      code: '',
      name: '',
      department: 'Engineering',
      shift: 'General',
      active: true,
      overtimeEligible: true,
      email: '',
      designation: ''
    });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editEmp) return;
    if (isNew) {
      const created = await apiPost<Employee>("/employees", {
        code: editEmp.code,
        name: editEmp.name,
        department: editEmp.department,
        shiftName: editEmp.shift,
        active: editEmp.active,
        overtimeEligible: editEmp.overtimeEligible,
        email: editEmp.email,
        designation: editEmp.designation
      });
      setEmployees(prev => [...prev, created]);
    } else {
      const updated = await apiPatch<Employee>(`/employees/${editEmp.id}`, {
        code: editEmp.code,
        name: editEmp.name,
        department: editEmp.department,
        active: editEmp.active,
        overtimeEligible: editEmp.overtimeEligible,
        email: editEmp.email,
        designation: editEmp.designation
      });
      if (editEmp.shift) {
        await apiPatch<Employee>(`/employees/${editEmp.id}/shift`, { shiftName: editEmp.shift });
      }
      setEmployees(prev => prev.map(e => e.id === editEmp.id ? updated : e));
    }
    setEditEmp(null);
  };

  const toggleActive = async (id: string) => {
    const employee = employees.find((e) => e.id === id);
    if (!employee) return;
    const updated = await apiPatch<Employee>(`/employees/${id}`, { active: !employee.active });
    setEmployees(prev => prev.map(e => e.id === id ? updated : e));
  };

  const activeCount = employees.filter(e => e.active).length;

  useEffect(() => {
    if (!viewEmp) return;
    fetchAttendanceSummary(viewEmp.id, detailMonth, detailPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewEmp?.id, detailMonth, detailPeriod]);

  return (
    <AppLayout title="Employees" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Employee Directory</h2>
            <Badge variant="secondary" className="text-xs">{activeCount} Active</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-56"
              />
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Add Employee
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="w-full overflow-x-auto">
            <table className="w-max text-xs min-w-[760px] whitespace-nowrap">
            <thead>
              <tr className="bg-muted/40 border-b">
                {['Code', 'Name', 'Department', 'Shift', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No employees found</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-muted-foreground">{emp.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-muted-foreground text-[11px]">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs font-normal">{emp.department}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.shift}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={emp.active}
                      onCheckedChange={() => toggleActive(emp.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetails(emp)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!editEmp} onOpenChange={() => setEditEmp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add Employee' : 'Edit Employee'}</DialogTitle>
          </DialogHeader>
          {editEmp && (
            <div className="space-y-3 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Employee Code</Label>
                  <Input value={editEmp.code} onChange={e => setEditEmp(p => p && ({ ...p, code: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={editEmp.name} onChange={e => setEditEmp(p => p && ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={editEmp.designation || ''} onChange={e => setEditEmp(p => p && ({ ...p, designation: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editEmp.email || ''} onChange={e => setEditEmp(p => p && ({ ...p, email: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={editEmp.department} onValueChange={v => setEditEmp(p => p && ({ ...p, department: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Shift</Label>
                  <Select value={editEmp.shift} onValueChange={v => setEditEmp(p => p && ({ ...p, shift: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{shifts.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label>Active Status</Label>
                <Switch checked={editEmp.active} onCheckedChange={v => setEditEmp(p => p && ({ ...p, active: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label>Overtime Eligible</Label>
                <Switch checked={editEmp.overtimeEligible} onCheckedChange={v => setEditEmp(p => p && ({ ...p, overtimeEligible: v }))} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditEmp(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{isNew ? 'Add Employee' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewEmp} onOpenChange={() => setViewEmp(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="leave" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="leave">Leave Summary</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            {/* Leave Summary Tab */}
            <TabsContent value="leave" className="space-y-3">
              {loadingSummary ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : !leaveSummary ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No leave data available</div>
              ) : (
                <>
                  <div className="border-b pb-3">
                    <p className="text-sm font-semibold">{viewEmp?.name}</p>
                    <p className="text-xs text-muted-foreground">{viewEmp?.code} • {viewEmp?.designation}</p>
                    <p className="text-xs text-muted-foreground mt-1">Year {leaveSummary.year}</p>
                  </div>

                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-2 border border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Allowance</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{leaveSummary.leaveAllowance}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Taken</p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{leaveSummary.leaveTaken}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{leaveSummary.leaveBalance}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground">Leave Breakdown</p>
                    {leaveSummary.detailByType.map((row) => (
                      <div key={row.code} className="rounded-lg border p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold">{row.name}</p>
                            <p className="text-[11px] text-muted-foreground">{row.paidLeave ? 'Paid' : 'Unpaid'}</p>
                          </div>
                          <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{row.code}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <p className="text-muted-foreground">Allowance</p>
                            <p className="font-semibold">{row.maxDays}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Taken</p>
                            <p className="font-semibold">{row.taken}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Balance</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">{row.balance}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Attendance Summary Tab */}
            <TabsContent value="attendance" className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Period</Label>
                  <Select value={detailPeriod} onValueChange={(v: any) => setDetailPeriod(v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {detailPeriod === 'monthly' && (
                  <div className="flex-1">
                    <Label className="text-xs">Month</Label>
                    <input type="month" value={detailMonth} onChange={(e) => setDetailMonth(e.target.value)} className="h-8 w-full px-2 text-xs border rounded" />
                  </div>
                )}
              </div>

              {loadingAttendance ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : !attendanceData ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No attendance data available</div>
              ) : (
                <>
                  <div className="border-b pb-2">
                    <p className="text-sm font-semibold">{viewEmp?.name}</p>
                    <p className="text-xs text-muted-foreground">{viewEmp?.code} • {formatPeriodLabel(detailMonth, detailPeriod)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <p className="text-xs text-muted-foreground">Present</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceData.present ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                      <p className="text-xs text-muted-foreground">Absent</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{attendanceData.absent ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-muted-foreground">Late</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{attendanceData.late ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-muted-foreground">Half Day</p>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{attendanceData.halfDay ?? 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="rounded-lg border p-2 text-center bg-blue-50 dark:bg-blue-950">
                      <p className="text-[11px] text-muted-foreground">Paid Sundays</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{attendanceData.payableSundays ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-2 text-center bg-purple-50 dark:bg-purple-950">
                      <p className="text-[11px] text-muted-foreground">Paid Holidays</p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{attendanceData.payableHolidays ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-2 text-center bg-red-50 dark:bg-red-950">
                      <p className="text-[11px] text-muted-foreground">LOP Days</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{attendanceData.lopDays ?? 0}</p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewEmp(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
