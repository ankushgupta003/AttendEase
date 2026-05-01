import { useEffect, useMemo, useState } from 'react';
import { DownloadSimple, FileArrowDown, Funnel, ChartBar, CurrencyInr } from '@phosphor-icons/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { apiDownload, apiGet, apiPatch } from '@/lib/api';
import { getInitialMonth, persistMonth } from '@/lib/month';
import { useToast } from '@/hooks/use-toast';

type SummaryRow = {
  employeeId: string;
  code: string;
  name: string;
  dept: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  paidLeaveDays: number;
  sandwichDays: number;
  lopDays: number;
  totalPaidDays: number;
  baseHrs: string;
  baseMinutes: number;
  overtimeMinutesRegular: number;
  overtimeMinutesWeekOff: number;
  overtimeMinutes: number;
  totalHrs: string;
  attendanceRemark: string;
};

type SalaryRow = SummaryRow & {
  salary: number;
  baseSalary: number;
  normalOtSalary: number;
  sundayHolidayOtSalary: number;
  totalOtSalary: number;
  grossSalary: number;
  totalSalary: number;
  fine: number;
  advance: number;
  others: number;
  arrear: number;
  salaryRemark: string;
  outstandingAdvance: number;
  deductions: number;
  netSalary: number;
};

const CODE_COL_WIDTH = 100;
const NAME_COL_WIDTH = 150;

function formatMoney(value: number) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatPaidDays(value: number) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function formatMinutes(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.abs(minutes % 60);
  return `${hrs}:${String(mins).padStart(2, '0')}`;
}

function floorHours(minutes: number) {
  return Math.max(0, Math.floor(num(minutes) / 60));
}

function formatFlooredOt(minutes: number) {
  return `${floorHours(minutes)}:00`;
}

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function stickyHeaderCellClass(column: 'code' | 'name') {
  if (column === 'code') {
    return 'sticky top-0 left-0 z-[180] box-border bg-card text-left px-4 py-3 font-semibold text-muted-foreground border-r border-border shadow-[1px_0_0_hsl(var(--border))]';
  }
  return 'sticky top-0 z-[170] box-border bg-card text-left px-4 py-3 font-semibold text-muted-foreground border-r border-border shadow-[1px_0_0_hsl(var(--border))]';
}

function stickyBodyCellClass(stickyBg: string, column: 'code' | 'name') {
  if (column === 'code') {
    return `sticky box-border left-0 z-[40] px-4 py-3 border-r border-border shadow-[1px_0_0_hsl(var(--border))] ${stickyBg}`;
  }
  return `sticky box-border z-[30] px-4 py-3 border-r border-border shadow-[1px_0_0_hsl(var(--border))] ${stickyBg}`;
}

function parseApiErrorMessage(error: unknown) {
  const fallback = 'Unable to save salary adjustment.';
  if (!(error instanceof Error)) return fallback;
  const text = error.message || fallback;
  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed?.message || fallback;
  } catch {
    return text;
  }
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [department, setDepartment] = useState('all');
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [salaryData, setSalaryData] = useState<SalaryRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [savingSalaryId, setSavingSalaryId] = useState<string | null>(null);
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    apiGet<SummaryRow[]>('/reports/attendance-summary', { month: selectedMonth, department })
      .then(setSummaryData)
      .catch(() => setSummaryData([]));

    apiGet<SalaryRow[]>('/reports/salary-sheet', { month: selectedMonth, department })
      .then(setSalaryData)
      .catch(() => setSalaryData([]));
  }, [selectedMonth, department]);

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    apiGet<{ department: string }[]>('/employees')
      .then((rows) => {
        const unique = Array.from(new Set(rows.map((row) => row.department))).sort();
        setDepartments(unique);
      })
      .catch(() => setDepartments([]));
  }, []);

  const summaryRows = useMemo(() => summaryData.map((row) => ({
    employeeId: '',
    code: '',
    name: '',
    dept: '',
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    paidLeaveDays: 0,
    sandwichDays: 0,
    lopDays: 0,
    totalPaidDays: 0,
    baseHrs: '0:00',
    baseMinutes: 0,
    overtimeMinutesRegular: 0,
    overtimeMinutesWeekOff: 0,
    overtimeMinutes: 0,
    totalHrs: '0:00',
    attendanceRemark: '',
    ...row
  })), [summaryData]);

  const salaryRows = useMemo(() => salaryData.map((row) => ({
    employeeId: '',
    code: '',
    name: '',
    dept: '',
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    paidLeaveDays: 0,
    sandwichDays: 0,
    lopDays: 0,
    totalPaidDays: 0,
    baseHrs: '0:00',
    baseMinutes: 0,
    overtimeMinutesRegular: 0,
    overtimeMinutesWeekOff: 0,
    overtimeMinutes: 0,
    totalHrs: '0:00',
    attendanceRemark: '',
    salary: 0,
    baseSalary: 0,
    normalOtSalary: 0,
    sundayHolidayOtSalary: 0,
    totalOtSalary: 0,
    grossSalary: 0,
    totalSalary: 0,
    fine: 0,
    advance: 0,
    others: 0,
    arrear: 0,
    salaryRemark: '',
    outstandingAdvance: 0,
    deductions: 0,
    netSalary: 0,
    ...row
  })), [salaryData]);

  const updateSalaryField = (
    employeeId: string,
    field: keyof Pick<SalaryRow, 'fine' | 'advance' | 'others' | 'arrear' | 'salaryRemark'>,
    value: number | string
  ) => {
    setSalaryData((prev) => prev.map((row) => row.employeeId === employeeId ? { ...row, [field]: value } : row));
  };

  const saveSalaryAdjustment = async (row: SalaryRow) => {
    if (!row.employeeId) return;
    setSavingSalaryId(row.employeeId);
    try {
      await apiPatch(`/reports/salary-sheet/${row.employeeId}/adjustment`, {
        month: selectedMonth,
        fine: Number(row.fine || 0),
        advance: Number(row.advance || 0),
        others: Number(row.others || 0),
        arrear: Number(row.arrear || 0),
        salaryRemark: row.salaryRemark || null
      });
      const refreshed = await apiGet<SalaryRow[]>('/reports/salary-sheet', { month: selectedMonth, department });
      setSalaryData(refreshed);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: parseApiErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setSavingSalaryId(null);
    }
  };

  const updateAttendanceRemark = (employeeId: string, remark: string) => {
    setSummaryData((prev) => prev.map((row) => row.employeeId === employeeId ? { ...row, attendanceRemark: remark } : row));
  };

  const saveAttendanceRemark = async (row: SummaryRow) => {
    if (!row.employeeId) return;
    setSavingAttendanceId(row.employeeId);
    try {
      await apiPatch(`/reports/attendance-summary/${row.employeeId}/remark`, {
        month: selectedMonth,
        remark: row.attendanceRemark || null
      });
    } finally {
      setSavingAttendanceId(null);
    }
  };

  return (
    <AppLayout title='Reports' selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className='ui-page'>
        <Card className='border-0 shadow-sm'>
          <CardContent className='py-4'>
            <div className='flex items-center gap-3 flex-wrap'>
              <div className='flex items-center gap-2'>
                <Funnel className='h-4 w-4 text-muted-foreground' />
                <Label className='text-sm font-semibold'>Department</Label>
              </div>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className='w-56 h-10 text-sm'>
                  <SelectValue placeholder='Department' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue='summary' className='space-y-4'>
          <TabsList className='h-10'>
            <TabsTrigger value='summary' className='text-sm gap-2'>
              <ChartBar className='h-4 w-4' /> Attendance Summary
            </TabsTrigger>
            <TabsTrigger value='salary' className='text-sm gap-2'>
              <CurrencyInr className='h-4 w-4' /> Salary Sheet
            </TabsTrigger>
          </TabsList>

          <TabsContent value='summary'>
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base font-semibold'>Attendance Summary</CardTitle>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-9 text-sm gap-2'
                    onClick={async () => {
                      const blob = await apiDownload('/reports/attendance-summary/export', { month: selectedMonth, department });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `attendance-summary-${selectedMonth}.xlsx`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                  >
                    <FileArrowDown className='h-4 w-4' />
                    <DownloadSimple className='h-3.5 w-3.5' /> Export Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className='rounded-lg border'>
                  <div className='ui-table-scroll relative isolate'>
                    <table className='w-full min-w-[1800px] text-sm data-grid'>
                      <thead>
                        <tr className='bg-muted/40 border-b'>
                          <th
                            className={stickyHeaderCellClass('code')}
                            style={{ width: `${CODE_COL_WIDTH}px`, minWidth: `${CODE_COL_WIDTH}px`, maxWidth: `${CODE_COL_WIDTH}px`, zIndex:180 }}
                          >
                            Code
                          </th>
                          <th
                            className={stickyHeaderCellClass('name')}
                            style={{ left: `${CODE_COL_WIDTH}px`, width: `${NAME_COL_WIDTH}px`, minWidth: `${NAME_COL_WIDTH}px`, maxWidth: `${NAME_COL_WIDTH}px`, zIndex:180 }}
                          >
                            Name
                          </th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Department</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Total Days</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Present</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Absent</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Late</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Half Day</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Leave</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Sandwich</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>LOP</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Paid Leaves</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Paid Days</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Base Hrs</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>OT</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Sunday/Holiday OT</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Total OT</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Total Hrs</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground min-w-[280px]'>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryRows.length === 0 ? (
                          <tr>
                            <td colSpan={19} className='py-10 text-center text-muted-foreground'>No attendance data found.</td>
                          </tr>
                        ) : summaryRows.map((row, idx) => {
                          const regularOtHours = floorHours(row.overtimeMinutesRegular);
                          const weekOffOtHours = floorHours(row.overtimeMinutesWeekOff);
                          const totalOtHours = regularOtHours + weekOffOtHours;
                          const stickyBg = idx % 2 === 0 ? 'bg-card' : 'bg-muted';
                          return (
                            <tr key={row.employeeId || `${row.code}-${row.name}`} className='group border-b border-border/50 last:border-0 hover:bg-muted/20'>
                              <td
                                className={`${stickyBodyCellClass(stickyBg, 'code')} font-mono text-muted-foreground`}
                                style={{ width: `${CODE_COL_WIDTH}px`, minWidth: `${CODE_COL_WIDTH}px`, maxWidth: `${CODE_COL_WIDTH}px` }}
                              >
                                {row.code}
                              </td>
                              <td
                                className={`${stickyBodyCellClass(stickyBg, 'name')} font-medium whitespace-normal break-words`}
                                style={{ left: `${CODE_COL_WIDTH}px`, width: `${NAME_COL_WIDTH}px`, minWidth: `${NAME_COL_WIDTH}px`, maxWidth: `${NAME_COL_WIDTH}px` }}
                              >
                                {row.name}
                              </td>
                              <td className='px-4 py-3 text-muted-foreground'>{row.dept}</td>
                              <td className='px-4 py-3'>{row.totalDays}</td>
                              <td className='px-4 py-3 text-status-present font-semibold'>{row.present}</td>
                              <td className='px-4 py-3 text-status-absent font-semibold'>{row.absent}</td>
                              <td className='px-4 py-3 text-status-late font-semibold'>{row.late}</td>
                              <td className='px-4 py-3'>{row.halfDay}</td>
                              <td className='px-4 py-3'>{row.leave}</td>
                              <td className='px-4 py-3'>{row.sandwichDays}</td>
                              <td className='px-4 py-3'>{row.lopDays}</td>
                              <td className='px-4 py-3'>{row.paidLeaveDays}</td>
                              <td className='px-4 py-3 font-semibold'>{formatPaidDays(row.totalPaidDays)}</td>
                              <td className='px-4 py-3 font-mono'>{row.baseHrs}</td>
                              <td className='px-4 py-3 font-mono'>{formatFlooredOt(row.overtimeMinutesRegular)}</td>
                              <td className='px-4 py-3 font-mono'>{formatFlooredOt(row.overtimeMinutesWeekOff)}</td>
                              <td className='px-4 py-3 font-mono'>{`${totalOtHours}:00`}</td>
                              <td className='px-4 py-3 font-mono'>{row.totalHrs}</td>
                              <td className='px-4 py-3 min-w-[280px]'>
                                <Input
                                  value={row.attendanceRemark ?? ''}
                                  onChange={(e) => updateAttendanceRemark(row.employeeId, e.target.value)}
                                  onBlur={() => saveAttendanceRemark(row)}
                                  className='h-9 text-sm'
                                  placeholder='Add remark'
                                  disabled={savingAttendanceId === row.employeeId}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {summaryRows.length > 0 && (
                        <tfoot>
                          <tr className='bg-muted/30 border-t-2 border-border'>
                            <td colSpan={3} className='px-4 py-3 font-semibold'>Totals</td>
                            <td className='px-4 py-3 font-semibold'>{summaryRows[0]?.totalDays ?? 0}</td>
                            <td className='px-4 py-3 font-semibold text-status-present'>{summaryRows.reduce((a, r) => a + num(r.present), 0)}</td>
                            <td className='px-4 py-3 font-semibold text-status-absent'>{summaryRows.reduce((a, r) => a + num(r.absent), 0)}</td>
                            <td className='px-4 py-3 font-semibold text-status-late'>{summaryRows.reduce((a, r) => a + num(r.late), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{summaryRows.reduce((a, r) => a + num(r.halfDay), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{summaryRows.reduce((a, r) => a + num(r.leave), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{summaryRows.reduce((a, r) => a + num(r.sandwichDays), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{summaryRows.reduce((a, r) => a + num(r.lopDays), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{summaryRows.reduce((a, r) => a + num(r.paidLeaveDays), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{formatPaidDays(summaryRows.reduce((a, r) => a + num(r.totalPaidDays), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMinutes(summaryRows.reduce((a, r) => a + num(r.baseMinutes), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{`${summaryRows.reduce((a, r) => a + floorHours(r.overtimeMinutesRegular), 0)}:00`}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{`${summaryRows.reduce((a, r) => a + floorHours(r.overtimeMinutesWeekOff), 0)}:00`}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{`${summaryRows.reduce((a, r) => a + floorHours(r.overtimeMinutesRegular) + floorHours(r.overtimeMinutesWeekOff), 0)}:00`}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMinutes(summaryRows.reduce((a, r) => a + num(r.baseMinutes) + num(r.overtimeMinutes), 0))}</td>
                            <td className='px-4 py-3'></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='salary'>
            <Card className='border-0 shadow-sm'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base font-semibold'>Salary Sheet</CardTitle>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-9 text-sm gap-2'
                    onClick={async () => {
                      const blob = await apiDownload('/reports/salary-sheet/export', { month: selectedMonth, department });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `salary-sheet-${selectedMonth}.xlsx`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                  >
                    <FileArrowDown className='h-4 w-4' />
                    <DownloadSimple className='h-3.5 w-3.5' /> Export Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className='rounded-lg border'>
                  <div className='ui-table-scroll relative isolate'>
                    <table className='w-full min-w-[2400px] text-sm data-grid'>
                      <thead>
                        <tr className='bg-muted/40 border-b'>
                          <th
                            className={stickyHeaderCellClass('code')}
                            style={{ width: `${CODE_COL_WIDTH}px`, minWidth: `${CODE_COL_WIDTH}px`, maxWidth: `${CODE_COL_WIDTH}px`, zIndex:180 }}
                          >
                            Code
                          </th>
                          <th
                            className={stickyHeaderCellClass('name')}
                            style={{ left: `${CODE_COL_WIDTH}px`, width: `${NAME_COL_WIDTH}px`, minWidth: `${NAME_COL_WIDTH}px`, maxWidth: `${NAME_COL_WIDTH}px`, zIndex:180 }}
                          >
                            Name
                          </th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Department</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Monthly Salary</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Base Salary</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Normal OT</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Sunday/Holiday OT</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Total OT</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Total Salary</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Fine</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Advance</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Others</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Arrear</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Outstanding Advance</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Deductions</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Net Salary</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground min-w-[300px]'>Remarks</th>
                          <th className='sticky top-0 z-[160] bg-muted/40 text-left px-4 py-3 font-semibold text-muted-foreground'>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryRows.length === 0 ? (
                          <tr>
                            <td colSpan={18} className='py-10 text-center text-muted-foreground'>No salary data found.</td>
                          </tr>
                        ) : salaryRows.map((row, idx) => {
                          const stickyBg = idx % 2 === 0 ? 'bg-card' : 'bg-muted';
                          return (
                          <tr key={row.employeeId || `${row.code}-${row.name}`} className='group border-b border-border/50 last:border-0 hover:bg-muted/20'>
                            <td
                              className={`${stickyBodyCellClass(stickyBg, 'code')} font-mono text-muted-foreground`}
                              style={{ width: `${CODE_COL_WIDTH}px`, minWidth: `${CODE_COL_WIDTH}px`, maxWidth: `${CODE_COL_WIDTH}px` }}
                            >
                              {row.code}
                            </td>
                            <td
                              className={`${stickyBodyCellClass(stickyBg, 'name')} font-medium whitespace-normal break-words`}
                              style={{ left: `${CODE_COL_WIDTH}px`, width: `${NAME_COL_WIDTH}px`, minWidth: `${NAME_COL_WIDTH}px`, maxWidth: `${NAME_COL_WIDTH}px` }}
                            >
                              {row.name}
                            </td>
                            <td className='px-4 py-3 text-muted-foreground'>{row.dept}</td>
                            <td className='px-4 py-3 font-mono'>{formatMoney(row.salary)}</td>
                            <td className='px-4 py-3 font-mono'>{formatMoney(row.baseSalary)}</td>
                            <td className='px-4 py-3 font-mono'>{formatMoney(row.normalOtSalary)}</td>
                            <td className='px-4 py-3 font-mono'>{formatMoney(row.sundayHolidayOtSalary)}</td>
                            <td className='px-4 py-3 font-mono'>{formatMoney(row.totalOtSalary)}</td>
                            <td className='px-4 py-3 font-mono'>{formatMoney(row.totalSalary)}</td>
                            <td className='px-4 py-3 min-w-[130px]'><Input type='number' value={row.fine ?? 0} className='h-9 text-sm' onChange={(e) => updateSalaryField(row.employeeId, 'fine', Number(e.target.value || 0))} /></td>
                            <td className='px-4 py-3 min-w-[130px]'><Input type='number' value={row.advance ?? 0} className='h-9 text-sm' onChange={(e) => updateSalaryField(row.employeeId, 'advance', Number(e.target.value || 0))} /></td>
                            <td className='px-4 py-3 min-w-[130px]'><Input type='number' value={row.others ?? 0} className='h-9 text-sm' onChange={(e) => updateSalaryField(row.employeeId, 'others', Number(e.target.value || 0))} /></td>
                            <td className='px-4 py-3 min-w-[130px]'><Input type='number' value={row.arrear ?? 0} className='h-9 text-sm' onChange={(e) => updateSalaryField(row.employeeId, 'arrear', Number(e.target.value || 0))} /></td>
                            <td className='px-4 py-3 font-mono'>{formatMoney(row.outstandingAdvance)}</td>
                            <td className='px-4 py-3 font-mono text-status-absent'>{formatMoney(row.deductions)}</td>
                            <td className='px-4 py-3 font-mono font-semibold text-status-present'>{formatMoney(row.netSalary)}</td>
                            <td className='px-4 py-3 min-w-[300px]'>
                              <Input
                                value={row.salaryRemark ?? ''}
                                className='h-9 text-sm'
                                placeholder='Add salary remark'
                                onChange={(e) => updateSalaryField(row.employeeId, 'salaryRemark', e.target.value)}
                              />
                            </td>
                            <td className='px-4 py-3'>
                              <Button size='sm' className='h-9 text-sm' disabled={savingSalaryId === row.employeeId} onClick={() => saveSalaryAdjustment(row)}>
                                {savingSalaryId === row.employeeId ? 'Saving...' : 'Save'}
                              </Button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                      {salaryRows.length > 0 && (
                        <tfoot>
                          <tr className='bg-muted/30 border-t-2 border-border'>
                            <td colSpan={3} className='px-4 py-3 font-semibold'>Totals</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.salary), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.baseSalary), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.normalOtSalary), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.sundayHolidayOtSalary), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.totalOtSalary), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.totalSalary), 0))}</td>
                            <td className='px-4 py-3 font-semibold'>{salaryRows.reduce((a, r) => a + num(r.fine), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{salaryRows.reduce((a, r) => a + num(r.advance), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{salaryRows.reduce((a, r) => a + num(r.others), 0)}</td>
                            <td className='px-4 py-3 font-semibold'>{salaryRows.reduce((a, r) => a + num(r.arrear), 0)}</td>
                            <td className='px-4 py-3 font-semibold font-mono'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.outstandingAdvance), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono text-status-absent'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.deductions), 0))}</td>
                            <td className='px-4 py-3 font-semibold font-mono text-status-present'>{formatMoney(salaryRows.reduce((a, r) => a + num(r.netSalary), 0))}</td>
                            <td className='px-4 py-3'></td>
                            <td className='px-4 py-3'></td>
                          </tr>
                        </tfoot>
                      )}
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
