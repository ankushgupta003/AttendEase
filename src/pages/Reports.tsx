import { useState } from 'react';
import { Download, FileSpreadsheet, Filter, BarChart2, Clock, IndianRupee } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/common/StatusBadge';
import { departments } from '@/data/mockData';
import { AttendanceStatus } from '@/types';

const summaryData = [
  { code: 'EMP001', name: 'Arjun Sharma', dept: 'Engineering', present: 20, absent: 2, late: 3, halfDay: 1, totalHrs: '162:30' },
  { code: 'EMP002', name: 'Priya Patel', dept: 'HR', present: 22, absent: 0, late: 1, halfDay: 0, totalHrs: '176:00' },
  { code: 'EMP003', name: 'Rahul Verma', dept: 'Finance', present: 18, absent: 3, late: 4, halfDay: 1, totalHrs: '148:45' },
  { code: 'EMP004', name: 'Sunita Rao', dept: 'Engineering', present: 21, absent: 1, late: 2, halfDay: 0, totalHrs: '168:20' },
  { code: 'EMP005', name: 'Vikram Singh', dept: 'Sales', present: 19, absent: 4, late: 1, halfDay: 1, totalHrs: '152:10' },
  { code: 'EMP006', name: 'Anita Desai', dept: 'Operations', present: 16, absent: 5, late: 2, halfDay: 2, totalHrs: '128:00' },
];

const salaryData = summaryData.map(e => ({
  ...e,
  grossSalary: 50000,
  deductions: Math.round((e.absent * 50000 / 26) + (e.late * 200)),
  netSalary: Math.round(50000 - (e.absent * 50000 / 26) - (e.late * 200)),
  lopDays: e.absent,
}));

export default function ReportsPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [department, setDepartment] = useState('all');

  const filtered = summaryData.filter(e => department === 'all' || e.dept === department);
  const filteredSalary = salaryData.filter(e => department === 'all' || e.dept === department);

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
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
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
              <BarChart2 className="h-3.5 w-3.5" /> Attendance Summary
            </TabsTrigger>
            <TabsTrigger value="salary" className="text-xs gap-1.5">
              <IndianRupee className="h-3.5 w-3.5" /> Salary Sheet
            </TabsTrigger>
          </TabsList>

          {/* Attendance Summary */}
          <TabsContent value="summary">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Attendance Summary Report</CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <Download className="h-3 w-3" /> Export Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {['Code', 'Name', 'Department', 'Present', 'Absent', 'Late', 'Half Day', 'Total Hours'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(row => (
                        <tr key={row.code} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{row.code}</td>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.dept}</td>
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
                          <td className="px-4 py-3 font-mono font-medium">{row.totalHrs}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t-2 border-border">
                        <td colSpan={3} className="px-4 py-2.5 font-semibold text-xs">Totals</td>
                        <td className="px-4 py-2.5 font-bold text-status-present">{filtered.reduce((a, r) => a + r.present, 0)}</td>
                        <td className="px-4 py-2.5 font-bold text-status-absent">{filtered.reduce((a, r) => a + r.absent, 0)}</td>
                        <td className="px-4 py-2.5 font-bold text-status-late">{filtered.reduce((a, r) => a + r.late, 0)}</td>
                        <td className="px-4 py-2.5 font-bold">{filtered.reduce((a, r) => a + r.halfDay, 0)}</td>
                        <td className="px-4 py-2.5"></td>
                      </tr>
                    </tfoot>
                  </table>
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
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <Download className="h-3 w-3" /> Export Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {['Code', 'Name', 'Department', 'Working Days', 'LOP Days', 'Gross (₹)', 'Deductions (₹)', 'Net Salary (₹)'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSalary.map(row => (
                        <tr key={row.code} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{row.code}</td>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.dept}</td>
                          <td className="px-4 py-3 font-medium">{row.present}</td>
                          <td className="px-4 py-3 text-status-absent font-medium">{row.lopDays}</td>
                          <td className="px-4 py-3 font-mono">₹{row.grossSalary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono text-status-absent">₹{row.deductions.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-status-present">₹{row.netSalary.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t-2 border-border">
                        <td colSpan={5} className="px-4 py-2.5 font-semibold text-xs">Totals</td>
                        <td className="px-4 py-2.5 font-bold font-mono">₹{filteredSalary.reduce((a, r) => a + r.grossSalary, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono text-status-absent">₹{filteredSalary.reduce((a, r) => a + r.deductions, 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 font-bold font-mono text-status-present">₹{filteredSalary.reduce((a, r) => a + r.netSalary, 0).toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
