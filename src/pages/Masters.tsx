import { useEffect, useRef, useState } from 'react';
import { Plus, PencilSimple, Trash, UploadSimple, DownloadSimple, Database } from '@phosphor-icons/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Shift, Holiday, LeaveType, LeavePolicy, SalaryType, AdvanceLedgerRow, AdvanceHistoryRow } from '@/types';
import { apiDelete, apiDownload, apiGet, apiPatch, apiPost, apiPostForm } from '@/lib/api';
import { getInitialMonth, persistMonth } from '@/lib/month';

export default function MastersPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy | null>(null);
  const [salaryTypes, setSalaryTypes] = useState<SalaryType[]>([]);
  const [editSalaryType, setEditSalaryType] = useState<SalaryType | null>(null);
  const [advanceLedgerRows, setAdvanceLedgerRows] = useState<AdvanceLedgerRow[]>([]);
  const [historyEmployee, setHistoryEmployee] = useState<AdvanceLedgerRow | null>(null);
  const [advanceHistoryRows, setAdvanceHistoryRows] = useState<AdvanceHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [issueEmployee, setIssueEmployee] = useState<AdvanceLedgerRow | null>(null);
  const [issueAmount, setIssueAmount] = useState<number>(0);
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [issueRemark, setIssueRemark] = useState('');
  const [apiMode, setApiMode] = useState<'local' | 'lan'>('local');
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:5000/api');
  const [testingConnection, setTestingConnection] = useState(false);

  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [editLeave, setEditLeave] = useState<LeaveType | null>(null);
  const holidayFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    apiGet<Shift[]>("/shifts").then(setShifts).catch(() => setShifts([]));
    apiGet<Holiday[]>("/holidays").then(setHolidays).catch(() => setHolidays([]));
    apiGet<LeaveType[]>("/leave-types").then(setLeaveTypes).catch(() => setLeaveTypes([]));
    apiGet<LeavePolicy>("/leave-policy").then(setLeavePolicy).catch(() => setLeavePolicy(null));
    apiGet<SalaryType[]>("/salary-types").then(setSalaryTypes).catch(() => setSalaryTypes([]));
  }, []);

  useEffect(() => {
    apiGet<AdvanceLedgerRow[]>("/advance-ledger", { month: selectedMonth })
      .then(setAdvanceLedgerRows)
      .catch(() => setAdvanceLedgerRows([]));
  }, [selectedMonth]);

  useEffect(() => {
    const savedMode = window.localStorage.getItem("apiMode") as 'local' | 'lan' | null;
    const savedBase = window.localStorage.getItem("apiBaseUrl");
    if (savedMode === 'lan') setApiMode('lan');
    if (savedBase && savedBase.trim()) setApiBaseUrl(savedBase.trim());
  }, []);

  const saveShift = async () => {
    if (!editShift) return;
    if (editShift.id) {
      const updated = await apiPatch<Shift>(`/shifts/${editShift.id}`, editShift);
      setShifts(prev => prev.map(s => s.id === editShift.id ? updated : s));
    } else {
      const created = await apiPost<Shift>("/shifts", editShift);
      setShifts(prev => [...prev, created]);
    }
    setEditShift(null);
  };

  const saveHoliday = async () => {
    if (!editHoliday) return;
    if (editHoliday.id) {
      const updated = await apiPatch<Holiday>(`/holidays/${editHoliday.id}`, editHoliday);
      setHolidays(prev => prev.map(h => h.id === editHoliday.id ? updated : h));
    } else {
      const created = await apiPost<Holiday>("/holidays", editHoliday);
      setHolidays(prev => [...prev, created]);
    }
    setEditHoliday(null);
  };

  const saveLeave = async () => {
    if (!editLeave) return;
    const payload = editLeave.paymentOnLapse ? { ...editLeave, carryForward: false } : editLeave;
    const saved = await apiPost<LeaveType>("/leave-types", payload);
    setLeaveTypes(prev => {
      const exists = prev.find(l => l.code === saved.code);
      return exists ? prev.map(l => l.code === saved.code ? saved : l) : [...prev, saved];
    });
    setEditLeave(null);
  };

  const saveSalaryType = async () => {
    if (!editSalaryType?.name?.trim()) return;
    if (editSalaryType.id) {
      const updated = await apiPatch<SalaryType>(`/salary-types/${editSalaryType.id}`, {
        name: editSalaryType.name.trim(),
        isActive: editSalaryType.isActive ?? true
      });
      setSalaryTypes((prev) => prev.map((row) => row.id === updated.id ? updated : row));
    } else {
      const created = await apiPost<SalaryType>("/salary-types", {
        name: editSalaryType.name.trim(),
        isActive: true
      });
      setSalaryTypes((prev) => [...prev, created]);
    }
    setEditSalaryType(null);
  };

  const parseApiErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    try {
      const parsed = JSON.parse(error.message) as { message?: string };
      return parsed?.message || fallback;
    } catch {
      return error.message || fallback;
    }
  };

  const refreshAdvanceLedger = async () => {
    const refreshed = await apiGet<AdvanceLedgerRow[]>("/advance-ledger", { month: selectedMonth });
    setAdvanceLedgerRows(refreshed);
  };

  const openAdvanceHistory = async (row: AdvanceLedgerRow) => {
    setHistoryEmployee(row);
    setHistoryLoading(true);
    try {
      const history = await apiGet<AdvanceHistoryRow[]>(`/advance-ledger/${row.employeeId}/history`);
      setAdvanceHistoryRows(history);
    } catch {
      setAdvanceHistoryRows([]);
      toast({ title: 'History load failed', description: 'Unable to fetch advance history.', variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const openIssueDialog = (row: AdvanceLedgerRow) => {
    setIssueEmployee(row);
    setIssueAmount(0);
    setIssueDate(new Date().toISOString().slice(0, 10));
    setIssueRemark('');
  };

  const submitAdvanceIssue = async () => {
    if (!issueEmployee) return;
    try {
      await apiPost(`/advance-ledger/${issueEmployee.employeeId}/issue`, {
        amount: Number(issueAmount || 0),
        entryDate: issueDate,
        remark: issueRemark || null
      });
      await refreshAdvanceLedger();
      if (historyEmployee?.employeeId === issueEmployee.employeeId) {
        const history = await apiGet<AdvanceHistoryRow[]>(`/advance-ledger/${issueEmployee.employeeId}/history`);
        setAdvanceHistoryRows(history);
      }
      toast({ title: 'Advance added', description: 'Manual advance entry has been recorded.' });
      setIssueEmployee(null);
    } catch (error) {
      toast({
        title: 'Add advance failed',
        description: parseApiErrorMessage(error, 'Unable to add advance entry.'),
        variant: 'destructive'
      });
    }
  };
  const updateLeaveYearType = async (yearType: LeavePolicy["yearType"]) => {
    try {
      const saved = await apiPatch<LeavePolicy>("/leave-policy", { yearType });
      setLeavePolicy(saved);
      toast({
        title: 'Leave year updated',
        description: yearType === 'CALENDAR'
          ? 'Calendar year (Jan-Dec) selected.'
          : 'Financial year (Apr-Mar) selected.'
      });
    } catch {
      toast({ title: 'Update failed', description: 'Unable to update leave year type.', variant: 'destructive' });
    }
  };

  const deleteHoliday = async (holidayId: string) => {
    if (!window.confirm('Delete this holiday? This action cannot be undone.')) return;
    try {
      await apiDelete(`/holidays/${holidayId}`);
      setHolidays(prev => prev.filter(h => h.id !== holidayId));
      toast({ title: 'Holiday deleted', description: 'Holiday has been removed.' });
    } catch (error) {
      toast({ title: 'Delete failed', description: 'Unable to delete holiday, please try again.', variant: 'destructive' });
    }
  };

  const deleteLeave = async (code: string, id: string) => {
    const key = (code || id || '').toString().trim();
    if (!key) {
      toast({ title: 'Delete failed', description: 'Leave type identifier is invalid.', variant: 'destructive' });
      return;
    }

    if (!window.confirm(`Delete leave type ${key}? This action cannot be undone.`)) return;

    try {
      console.debug('Deleting leave type', { code, id, key });
      const path = `/leave-types/${encodeURIComponent(key)}`;
      await apiDelete(path);
      setLeaveTypes(prev => prev.filter(l => l.code !== code && l.id !== id));
      toast({ title: 'Leave type deleted', description: `Leave type ${key} has been removed.` });
    } catch (error) {
      console.error('Delete leave failed', error, { code, id, key });
      toast({ title: 'Delete failed', description: `Unable to delete leave type ${key}.`, variant: 'destructive' });
    }
  };

  const uploadHolidayFile = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    await apiPostForm("/holidays/upload", form);
    const fresh = await apiGet<Holiday[]>("/holidays");
    setHolidays(fresh);
  };

  const downloadHolidayTemplate = async () => {
    const blob = await apiDownload("/holidays/template");
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "holiday_template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const saveConnection = () => {
    const trimmed = apiBaseUrl.trim();
    if (!trimmed) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid API base URL.', variant: 'destructive' });
      return;
    }
    window.localStorage.setItem("apiMode", apiMode);
    window.localStorage.setItem("apiBaseUrl", trimmed);
    toast({ title: 'Connection saved', description: 'Settings saved. Reloading to apply.' });
    window.location.reload();
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const base = apiBaseUrl.trim();
      const url = base.endsWith("/api") ? base.slice(0, -4) : base;
      const res = await fetch(`${url}/health`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      toast({ title: 'Connection successful', description: 'Server is reachable.' });
    } catch (error) {
      toast({ title: 'Connection failed', description: 'Unable to reach the server.', variant: 'destructive' });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <AppLayout title="Master Data" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="ui-page">
        <h2 className="text-base font-semibold">Master Configuration</h2>

        <Tabs defaultValue="shifts" className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="shifts" className="text-xs">Shifts</TabsTrigger>
            <TabsTrigger value="holidays" className="text-xs">Holidays</TabsTrigger>
            <TabsTrigger value="leave" className="text-xs">Leave Types</TabsTrigger>
            <TabsTrigger value="salary-types" className="text-xs">Salary Types</TabsTrigger>
            <TabsTrigger value="advance-ledger" className="text-xs">Advance Ledger</TabsTrigger>
            <TabsTrigger value="connection" className="text-xs">Connection</TabsTrigger>
          </TabsList>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Shift Definitions</CardTitle>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditShift({ id: '', name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, lunchBreakMinutes: 0 })}>
                    <Plus className="h-3 w-3" weight="bold" /> Add Shift
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shifts.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors">
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.startTime} - {s.endTime}</p>
                        <p className="text-xs text-muted-foreground">Grace: {s.graceMinutes} mins</p>
                        <p className="text-xs text-muted-foreground">Lunch break: {s.lunchBreakMinutes ?? 0} mins</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditShift({ ...s, lunchBreakMinutes: s.lunchBreakMinutes ?? 0 })}
                      >
                        <PencilSimple className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holidays Tab */}
          <TabsContent value="holidays">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-semibold">Holiday Calendar</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => holidayFileRef.current?.click()}
                    >
                      <UploadSimple className="h-3 w-3" /> Upload Excel
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={downloadHolidayTemplate}>
                      <DownloadSimple className="h-3 w-3" /> Template
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditHoliday({ id: '', name: '', date: '', type: 'National' })}>
                      <Plus className="h-3 w-3" weight="bold" /> Add Holiday
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <input
                  ref={holidayFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadHolidayFile(file);
                  }}
                />
                <div className="rounded-lg border">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-xs data-grid">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {['Holiday Name', 'Date', 'Type', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holidays.map(h => (
                        <tr key={h.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">{h.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-xs font-normal">{h.type}</Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditHoliday(h)}><PencilSimple className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteHoliday(h.id)}><Trash className="h-3 w-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Types Tab */}
          <TabsContent value="leave">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Leave Types</CardTitle>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditLeave({ id: '', name: '', code: '', paidLeave: true, carryForward: false, paymentOnLapse: false, maxDays: 0 })}>
                    <Plus className="h-3 w-3" weight="bold" /> Add Leave Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3 p-3 mb-3 rounded-lg border bg-muted/20">
                  <div>
                    <p className="text-xs font-semibold">Leave Year Type</p>
                    <p className="text-[11px] text-muted-foreground">Choose calendar year or financial year for annual leave calculations.</p>
                  </div>
                  <Select
                    value={leavePolicy?.yearType ?? 'CALENDAR'}
                    onValueChange={(v: any) => updateLeaveYearType(v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALENDAR" className="text-xs">Calendar Year (Jan-Dec)</SelectItem>
                      <SelectItem value="FINANCIAL" className="text-xs">Financial Year (Apr-Mar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {leaveTypes.map(l => (
                    <div key={l.id} className="flex items-start justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{l.name}</span>
                          <Badge variant="secondary" className="text-xs font-mono">{l.code}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Max: {l.maxDays === 0 ? 'Unlimited' : `${l.maxDays} days`}</p>
                        <span className={`text-xs font-medium ${l.paidLeave ? 'text-status-present' : 'text-status-absent'}`}>
                          {l.paidLeave ? '● Paid' : '● Unpaid'}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant={l.carryForward ? "secondary" : "outline"} className="text-[10px] font-normal">
                            {l.carryForward ? "Carry Forward: Yes" : "Carry Forward: No"}
                          </Badge>
                          <Badge variant={l.paymentOnLapse ? "secondary" : "outline"} className="text-[10px] font-normal">
                            {l.paymentOnLapse ? "Payment: Yes" : "Payment: No"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditLeave(l)}>
                          <PencilSimple className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLeave(l.code, l.id)}>
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary-types">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Salary Type Master</CardTitle>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditSalaryType({ id: '', name: '', isActive: true })}>
                    <Plus className="h-3 w-3" weight="bold" /> Add Salary Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {salaryTypes.map((row) => (
                    <div key={row.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-semibold">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSalaryType(row)}>
                        <PencilSimple className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advance-ledger">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Advance Ledger Master ({selectedMonth})</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <div className="ui-table-scroll max-h-[520px]">
                    <table className="w-full text-xs data-grid min-w-[1120px]">
                      <thead>
                        <tr className="bg-muted/40 border-b">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Code</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Name</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Department</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Fine</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Advance</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Others</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Arrear</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Outstanding</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Remark</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advanceLedgerRows.map((row) => (
                          <tr key={row.employeeId} className="border-b border-border/50 last:border-0">
                            <td className="px-4 py-2.5 font-mono">{row.code}</td>
                            <td className="px-4 py-2.5 font-medium">{row.name}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{row.department}</td>
                            <td className="px-4 py-2.5">Rs {Number(row.fine || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5">Rs {Number(row.advance || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5">Rs {Number(row.others || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5">Rs {Number(row.arrear || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 font-medium">Rs {Number(row.outstandingAdvance || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5">{row.salaryRemark || '-'}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openIssueDialog(row)}>Add Advance</Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openAdvanceHistory(row)}>View History</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connection Tab */}
          <TabsContent value="connection">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Database Connection</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mode</Label>
                    <Select value={apiMode} onValueChange={(v: any) => setApiMode(v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local" className="text-xs">Local (SQLite)</SelectItem>
                        <SelectItem value="lan" className="text-xs">LAN Server (PostgreSQL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>API Base URL</Label>
                    <Input
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="http://SERVER_IP:5000/api"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" className="h-8 text-xs" onClick={saveConnection}>
                    Save Connection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={testConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? 'Testing…' : 'Test Connection'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    For LAN mode, point the API URL to the server PC running the backend with PostgreSQL.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!issueEmployee} onOpenChange={() => setIssueEmployee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Advance {issueEmployee ? `- ${issueEmployee.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min={1}
                value={issueAmount || ''}
                onChange={(e) => setIssueAmount(Number(e.target.value || 0))}
                className="h-8 text-xs"
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remark</Label>
              <Input
                value={issueRemark}
                onChange={(e) => setIssueRemark(e.target.value)}
                className="h-8 text-xs"
                placeholder="Optional remark"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIssueEmployee(null)}>Cancel</Button>
            <Button size="sm" onClick={submitAdvanceIssue}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyEmployee} onOpenChange={() => setHistoryEmployee(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Advance History {historyEmployee ? `- ${historyEmployee.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-xs data-grid">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Month</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Outstanding</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground min-w-[280px]">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading history...</td></tr>
                  ) : advanceHistoryRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No advance history found.</td></tr>
                  ) : advanceHistoryRows.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2">{item.date}</td>
                      <td className="px-3 py-2">{item.month}</td>
                      <td className="px-3 py-2">{item.type}</td>
                      <td className="px-3 py-2">Rs {Number(item.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 font-medium">Rs {Number(item.runningOutstanding || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 wrap">{item.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setHistoryEmployee(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSalaryType} onOpenChange={() => setEditSalaryType(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editSalaryType?.id ? 'Edit Salary Type' : 'New Salary Type'}</DialogTitle></DialogHeader>
          {editSalaryType && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editSalaryType.name} onChange={e => setEditSalaryType(p => p && ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label>Active</Label>
                <Switch checked={editSalaryType.isActive} onCheckedChange={v => setEditSalaryType(p => p && ({ ...p, isActive: v }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditSalaryType(null)}>Cancel</Button>
            <Button size="sm" onClick={saveSalaryType}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Modal */}
      <Dialog open={!!editShift} onOpenChange={() => setEditShift(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editShift?.id ? 'Edit Shift' : 'New Shift'}</DialogTitle></DialogHeader>
          {editShift && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Shift Name</Label>
                <Input value={editShift.name} onChange={e => setEditShift(p => p && ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={editShift.startTime} onChange={e => setEditShift(p => p && ({ ...p, startTime: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={editShift.endTime} onChange={e => setEditShift(p => p && ({ ...p, endTime: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Grace Minutes</Label>
                <Input type="number" value={editShift.graceMinutes} onChange={e => setEditShift(p => p && ({ ...p, graceMinutes: Number(e.target.value) }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Lunch Break Minutes</Label>
                <Input
                  type="number"
                  value={editShift.lunchBreakMinutes}
                  onChange={e => setEditShift(p => p && ({ ...p, lunchBreakMinutes: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditShift(null)}>Cancel</Button>
            <Button size="sm" onClick={saveShift}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holiday Modal */}
      <Dialog open={!!editHoliday} onOpenChange={() => setEditHoliday(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editHoliday?.id ? 'Edit Holiday' : 'New Holiday'}</DialogTitle></DialogHeader>
          {editHoliday && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Holiday Name</Label>
                <Input value={editHoliday.name} onChange={e => setEditHoliday(p => p && ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={editHoliday.date} onChange={e => setEditHoliday(p => p && ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditHoliday(null)}>Cancel</Button>
            <Button size="sm" onClick={saveHoliday}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Type Modal */}
      <Dialog open={!!editLeave} onOpenChange={() => setEditLeave(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editLeave?.id ? 'Edit Leave Type' : 'New Leave Type'}</DialogTitle></DialogHeader>
          {editLeave && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={editLeave.name} onChange={e => setEditLeave(p => p && ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Code</Label>
                  <Input value={editLeave.code} onChange={e => setEditLeave(p => p && ({ ...p, code: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Max Days (0 = unlimited)</Label>
                <Input type="number" value={editLeave.maxDays} onChange={e => setEditLeave(p => p && ({ ...p, maxDays: Number(e.target.value) }))} className="h-8 text-xs" />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label>Paid Leave</Label>
                <Switch checked={editLeave.paidLeave} onCheckedChange={v => setEditLeave(p => p && ({ ...p, paidLeave: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label>Carry Forward</Label>
                <Switch
                  checked={editLeave.carryForward}
                  disabled={editLeave.paymentOnLapse}
                  onCheckedChange={v => setEditLeave(p => p && ({ ...p, carryForward: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label>Payment on Lapse</Label>
                <Switch
                  checked={editLeave.paymentOnLapse}
                  onCheckedChange={v => setEditLeave(p => p && ({ ...p, paymentOnLapse: v, carryForward: v ? false : p.carryForward }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditLeave(null)}>Cancel</Button>
            <Button size="sm" onClick={saveLeave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
