import { useEffect, useState } from 'react';
import { DownloadSimple, FileArrowDown, Funnel, ChartBar, CurrencyInr } from '@phosphor-icons/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiDownload, apiGet } from '@/lib/api';
import { getInitialMonth, persistMonth } from '@/lib/month';

type SummaryRow = {
  code: string;
  name: string;
  dept: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  totalHrs: string;
  baseHrs: string;
  baseMinutes: number;
  overtimeHrs: string;
  overtimeMinutes: number;
  overtimeHrsWeekOff: string;
  overtimeMinutesWeekOff: number;
  overtimeHrsRegular: string;
  overtimeMinutesRegular: number;
  overtimeEligible: boolean;
  paidLeaveDays: number;
  sundayDays: number;
  payableSundays: number;
  holidayDays: number;
  payableHolidays: number;
  sandwichDays: number;
  sandwichSundayDays: number;
  sandwichHolidayDays: number;
  lopDays: number;
  totalPaidDays: number;
};
type SalaryRow = SummaryRow & {
  salary: number;
  baseSalary: number;
  normalOtSalary: number;
  sundayHolidayOtSalary: number;
  totalOtSalary: number;
  grossSalary: number;
  totalSalary: number;
  deductions: number;
  netSalary: number;
};

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [department, setDepartment] = useState('all');
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [salaryData, setSalaryData] = useState<SalaryRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [overtimeVisible, setOvertimeVisible] = useState<Record<string, boolean>>({});

  const formatPaidDays = (value: number) => Number.isInteger(value) ? value : value.toFixed(1);
  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.abs(minutes % 60);
    return `${hrs}:${String(mins).padStart(2, '0')}`;
  };
  const formatWholeHourOvertime = (minutes: number) => {
    const floored = Math.floor(minutes / 60) * 60;
    return formatMinutes(floored);
  };
  const formatWholeHourOvertimeTotal = (regularMinutes: number, weekOffMinutes: number) => {
    const flooredRegular = Math.floor(regularMinutes / 60) * 60;
    const flooredWeekOff = Math.floor(weekOffMinutes / 60) * 60;
    return formatMinutes(flooredRegular + flooredWeekOff);
  };

  useEffect(() => {
    apiGet<SummaryRow[]>("/reports/attendance-summary", { month: selectedMonth, department })
      .then(setSummaryData)
      .catch(() => setSummaryData([]));
    apiGet<SalaryRow[]>("/reports/salary-sheet", { month: selectedMonth, department })
      .then(setSalaryData)
      .catch(() => setSalaryData([]));
  }, [selectedMonth, department]);

  useEffect(() => {
    setOvertimeVisible({});
  }, [selectedMonth, department]);

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    apiGet<{ department: string }[]>("/employees")
      .then((rows) => {
        const unique = Array.from(new Set(rows.map((row) => row.department))).sort();
        setDepartments(unique);
      })
      .catch(() => setDepartments([]));
  }, []);

  const filtered = summaryData.map((row) => ({
    code: "",
    name: "",
    dept: "",
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    totalHrs: "0:00",
    baseHrs: "0:00",
    baseMinutes: 0,
    overtimeHrs: "0:00",
    overtimeMinutes: 0,
    overtimeHrsWeekOff: "0:00",
    overtimeMinutesWeekOff: 0,
    overtimeHrsRegular: "0:00",
    overtimeMinutesRegular: 0,
    overtimeEligible: false,
    paidLeaveDays: 0,
    sundayDays: 0,
    payableSundays: 0,
    holidayDays: 0,
    payableHolidays: 0,
    sandwichDays: 0,
    sandwichSundayDays: 0,
    sandwichHolidayDays: 0,
    lopDays: 0,
    totalPaidDays: 0,
    ...row
  }));
  const filteredSalary = salaryData.map((row) => ({
    salary: 0,
    baseSalary: 0,
    normalOtSalary: 0,
    sundayHolidayOtSalary: 0,
    totalOtSalary: 0,
    grossSalary: 0,
    totalSalary: 0,
    deductions: 0,
    netSalary: 0,
    ...row
  }));

  const getRowKey = (row: SummaryRow) => row.code || row.name;

  const toggleOvertime = (key: string) => {
    setOvertimeVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleOvertimeMinutes = filtered.reduce((sum, row) => {
    if (row.overtimeEligible) return sum + (row.overtimeMinutes ?? 0);
    const key = getRowKey(row);
    if (!overtimeVisible[key]) return sum;
    return sum + (row.overtimeMinutes ?? 0);
  }, 0);
  const visibleWeekOffOvertimeMinutes = filtered.reduce((sum, row) => {
    if (row.overtimeEligible) return sum + Math.floor((row.overtimeMinutesWeekOff ?? 0) / 60) * 60;
    const key = getRowKey(row);
    if (!overtimeVisible[key]) return sum;
    return sum + Math.floor((row.overtimeMinutesWeekOff ?? 0) / 60) * 60;
  }, 0);
  const visibleRegularOvertimeMinutes = filtered.reduce((sum, row) => {
    if (row.overtimeEligible) return sum + Math.floor((row.overtimeMinutesRegular ?? 0) / 60) * 60;
    const key = getRowKey(row);
    if (!overtimeVisible[key]) return sum;
    return sum + Math.floor((row.overtimeMinutesRegular ?? 0) / 60) * 60;
  }, 0);

  return (
    <AppLayout title="Reports" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold">Reports & Exports</h2>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Funnel className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Filters:</Label>
              </div>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="summary" className="text-xs gap-1.5">
              <ChartBar className="h-3.5 w-3.5" /> Attendance Summary
            </TabsTrigger>
            <TabsTrigger value="salary" className="text-xs gap-1.5">
              <CurrencyInr className="h-3.5 w-3.5" /> Salary Sheet
            </TabsTrigger>
          </TabsList>

          {/* Attendance Summary */}
          <TabsContent value="summary">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Attendance Summary Report</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={async () => {
                      const blob = await apiDownload("/reports/attendance-summary/export", { month: selectedMonth, department });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `attendance-summary-${selectedMonth}.xlsx`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                  >
                    <FileArrowDown className="h-3.5 w-3.5" />
                    <DownloadSimple className="h-3 w-3" /> Export Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <div className="w-full overflow-auto max-h-[500px] pb-2">
                    <table className="w-full text-xs data-grid">
                    <thead className="whitespace-nowrap sticky top-0 z-10 bg-white">
                      <tr className="bg-muted/40 border-b">
                        {[
                          'Code',
                          'Name',
                          'Department',
                          'Total Days',
                          'Present',
                          'Absent',
                          'Late',
                          'Half Day',
                          'Leave',
                          'Sandwich',
                          'LOP',
                          'Paid Leaves',
                          'Paid Sundays',
                          'Paid Holidays',
                          'Total Paid Days',
                          'Base Hours',
                          'OT',
                          'Week Off OT',
                          'Total OT',
                          'Total Hours'
                        ].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="whitespace-nowrap">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={20} className="py-8 text-center text-sm text-muted-foreground">No attendance data found for selected month/department.</td>
                        </tr>
                      ) : filtered.map(row => (
                        <tr key={getRowKey(row) || `${row.name}-${Math.random()}`} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{row.code}</td>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.dept}</td>
                          <td className="px-4 py-3 font-medium">{row.totalDays}</td>
                          <td className="px-4 py-3">
                            <span className="text-status-present font-semibold">{row.present}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={row.absent > 2 ? 'text-status-absent font-semibold' : 'text-muted-foreground'}>{row.absent}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={row.late > 2 ? 'text-status-late font-semibold' : 'text-muted-foreground'}>{row.late}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.halfDay}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.leave ?? 0}</td>
                          <td className="px-4 py-3 text-status-absent font-semibold">{row.sandwichDays ?? 0}</td>
                          <td className="px-4 py-3 text-status-absent font-semibold">{row.lopDays}</td>
                          <td className="px-4 py-3 font-medium">{row.paidLeaveDays ?? 0}</td>
                          <td className="px-4 py-3 font-medium">{row.payableSundays ?? 0}</td>
                          <td className="px-4 py-3 font-medium">{row.payableHolidays ?? 0}</td>
                          <td className="px-4 py-3 font-semibold">{formatPaidDays(row.totalPaidDays ?? 0)}</td>
                          <td className="px-4 py-3 font-mono font-medium">{row.baseHrs}</td>
                          <td className="px-4 py-3">
                            {row.overtimeEligible ? (
                              <span className="font-mono font-medium">{formatWholeHourOvertime(row.overtimeMinutesRegular)}</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {overtimeVisible[getRowKey(row)] ? (
                                  <>
                                    <span className="font-mono font-medium">{formatWholeHourOvertime(row.overtimeMinutesRegular)}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => toggleOvertime(getRowKey(row))}
                                    >
                                      Hide
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => toggleOvertime(getRowKey(row))}
                                  >
                                    Show overtime
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.overtimeEligible || overtimeVisible[getRowKey(row)] ? (
                              <span className="font-mono font-medium">{formatWholeHourOvertime(row.overtimeMinutesWeekOff)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.overtimeEligible || overtimeVisible[getRowKey(row)] ? (
                              <span className="font-mono font-medium">{formatWholeHourOvertimeTotal(row.overtimeMinutesRegular, row.overtimeMinutesWeekOff)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          {/* <td className="px-4 py-3 font-mono font-medium">{row.overtimeHrs}</td> */}
                          <td className="px-4 py-3 font-mono font-medium">{row.totalHrs}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t-2 border-border">
                        <td colSpan={3} className="px-4 py-2.5 font-semibold text-xs">Totals</td>
                        <td className="px-4 py-2.5 font-bold">{filtered[0]?.totalDays ?? 0}</td>
                        <td className="px-4 py-2.5 font-bold text-status-present">{filtered.reduce((a, r) => a + r.present, 0)}</td>
                        <td className="px-4 py-2.5 font-bold text-status-absent">{filtered.reduce((a, r) => a + r.absent, 0)}</td>
                        <td className="px-4 py-2.5 font-bold text-status-late">{filtered.reduce((a, r) => a + r.late, 0)}</td>
                        <td className="px-4 py-2.5 font-bold">{filtered.reduce((a, r) => a + r.halfDay, 0)}</td>
                        <td className="px-4 py-2.5 font-bold">{filtered.reduce((a, r) => a + (r.leave ?? 0), 0)}</td>
                        <td className="px-4 py-2.5 font-bold text-status-absent">{filtered.reduce((a, r) => a + (r.sandwichDays ?? 0), 0)}</td>
                        <td className="px-4 py-2.5 font-bold text-status-absent">{filtered.reduce((a, r) => a + r.lopDays, 0)}</td>
                        <td className="px-4 py-2.5 font-bold">{filtered.reduce((a, r) => a + (r.paidLeaveDays ?? 0), 0)}</td>
                        <td className="px-4 py-2.5 font-bold">{filtered.reduce((a, r) => a + (r.payableSundays ?? 0), 0)}</td>
                        <td className="px-4 py-2.5 font-bold">{filtered.reduce((a, r) => a + (r.payableHolidays ?? 0), 0)}</td>
                        <td className="px-4 py-2.5 font-bold">{formatPaidDays(filtered.reduce((a, r) => a + (r.totalPaidDays ?? 0), 0))}</td>
                        {/* <td className="px-4 py-2.5"></td> */}
                        <td className="px-4 py-2.5 font-bold font-mono">{formatMinutes(filtered.reduce((a, r) => a + (r.baseMinutes ?? 0), 0))}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">{formatMinutes(visibleRegularOvertimeMinutes)}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">{formatMinutes(visibleWeekOffOvertimeMinutes)}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">{formatMinutes(visibleRegularOvertimeMinutes + visibleWeekOffOvertimeMinutes)}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">{formatMinutes(filtered.reduce((a, r) => a + (r.baseMinutes ?? 0) + (r.overtimeMinutes ?? 0), 0))}</td>
                      </tr>
                    </tfoot>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Sheet */}
          <TabsContent value="salary">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Salary Sheet</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={async () => {
                      const blob = await apiDownload("/reports/salary-sheet/export", { month: selectedMonth, department });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `salary-sheet-${selectedMonth}.xlsx`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                  >
                    <FileArrowDown className="h-3.5 w-3.5" />
                    <DownloadSimple className="h-3 w-3" /> Export Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <div className="w-full overflow-auto max-h-[500px] pb-2">
                    <table className="w-full text-xs data-grid">
                    <thead className="whitespace-nowrap sticky top-0 z-10 bg-white">
                      <tr className="bg-muted/40 border-b">
                        {['Code', 'Name', 'Department', 'Monthly Salary (₹)', 'Base Salary (₹)', 'Normal OT (₹)', 'Sunday/Holiday OT (₹)', 'Total OT (₹)', 'Total Salary (₹)', 'Deductions (₹)', 'Net Salary (₹)'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="whitespace-nowrap">
                      {filteredSalary.map(row => (
                        <tr key={row.code} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{row.code}</td>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.dept}</td>
                          <td className="px-4 py-3 font-mono">₹{row.salary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono">₹{row.baseSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono">₹{row.normalOtSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono">₹{row.sundayHolidayOtSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono">₹{row.totalOtSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono">₹{row.totalSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono text-status-absent">₹{row.deductions.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-status-present">₹{row.netSalary.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t-2 border-border">
                        <td colSpan={3} className="px-4 py-2.5 font-semibold text-xs">Totals</td>
                        <td className="px-4 py-2.5 font-bold font-mono">₹{filteredSalary.reduce((a, r) => a + r.salary, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">₹{filteredSalary.reduce((a, r) => a + r.baseSalary, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">₹{filteredSalary.reduce((a, r) => a + r.normalOtSalary, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">₹{filteredSalary.reduce((a, r) => a + r.sundayHolidayOtSalary, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">₹{filteredSalary.reduce((a, r) => a + r.totalOtSalary, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono">₹{filteredSalary.reduce((a, r) => a + r.totalSalary, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono text-status-absent">₹{filteredSalary.reduce((a, r) => a + r.deductions, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono text-status-present">₹{filteredSalary.reduce((a, r) => a + r.netSalary, 0).toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
