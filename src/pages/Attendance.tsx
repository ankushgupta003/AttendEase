import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Upload, Download, CheckCircle2, Lock, AlertTriangle,
  Pencil, ChevronUp, ChevronDown, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AppLayout } from '@/components/layout/AppLayout';
import { FilterBar } from '@/components/attendance/FilterBar';
import { StatusBadge, getRowClass } from '@/components/common/StatusBadge';
import { AttendanceEditModal } from '@/components/attendance/AttendanceEditModal';
import { BulkActionModal } from '@/components/attendance/BulkActionModal';
import { generateAttendanceRecords } from '@/data/mockData';
import { AttendanceRecord, FinalizationStatus } from '@/types';

type SortKey = 'date' | 'employeeCode' | 'employeeName' | 'status';
type SortDir = 'asc' | 'desc';

const exceptionStatuses = ['Absent', 'Late', 'Half Day', 'Missing Punch'];

export default function AttendancePage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [records, setRecords] = useState<AttendanceRecord[]>(() => generateAttendanceRecords(selectedMonth));
  const [finStatus, setFinStatus] = useState<FinalizationStatus>('Draft');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    setRecords(generateAttendanceRecords(m));
    setFinStatus('Draft');
    setSelected(new Set());
  };

  const filtered = useMemo(() => {
    let res = records;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(r => r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q));
    }
    if (department && department !== 'all') res = res.filter(r => r.department === department);
    if (status && status !== 'all') res = res.filter(r => r.status === status);
    if (exceptionsOnly) res = res.filter(r => exceptionStatuses.includes(r.status));
    return [...res].sort((a, b) => {
      const av = a[sortKey as keyof AttendanceRecord] as string;
      const bv = b[sortKey as keyof AttendanceRecord] as string;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, search, department, status, exceptionsOnly, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />;
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  };

  const handleSave = (updated: AttendanceRecord) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const exceptionCount = records.filter(r => exceptionStatuses.includes(r.status)).length;

  const finStatusConfig = {
    Draft: { label: 'Draft', className: 'bg-muted text-muted-foreground', icon: null },
    Finalized: { label: 'Finalized', className: 'bg-status-present-bg text-status-present', icon: CheckCircle2 },
    Locked: { label: 'Locked', className: 'bg-status-absent-bg text-status-absent', icon: Lock },
  };
  const fin = finStatusConfig[finStatus];

  return (
    <AppLayout title="Attendance" selectedMonth={selectedMonth} onMonthChange={handleMonthChange}>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Monthly Attendance</h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${fin.className}`}>
              {fin.icon && <fin.icon className="h-3 w-3" />}
              {fin.label}
            </span>
            {finStatus !== 'Draft' && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Editing disabled
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selected.size > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />{selected.size} selected
              </span>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setBulkOpen(true)}>
              Bulk Actions
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            {finStatus === 'Draft' && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFinStatus('Finalized')}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Finalize Month
              </Button>
            )}
            {finStatus === 'Finalized' && (
              <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={() => setFinStatus('Locked')}>
                <Lock className="h-3.5 w-3.5" /> Lock
              </Button>
            )}
          </div>
        </div>

        {/* Exception notice */}
        {exceptionCount > 0 && !exceptionsOnly && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-missing-bg border border-status-missing/20 text-xs text-status-missing">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span><strong>{exceptionCount}</strong> exceptions found (missing punches, late, absences).</span>
            <button onClick={() => setExceptionsOnly(true)} className="ml-auto underline font-medium hover:no-underline">
              Show exceptions only →
            </button>
          </div>
        )}

        {/* Filter bar */}
        <FilterBar
          search={search} onSearchChange={setSearch}
          department={department} onDepartmentChange={setDepartment}
          status={status} onStatusChange={setStatus}
          showExceptionsOnly={exceptionsOnly} onToggleExceptions={() => setExceptionsOnly(v => !v)}
        />

        {/* Summary row */}
        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
          <span>Showing <strong className="text-foreground">{filtered.length}</strong> records</span>
          {exceptionsOnly && <Badge variant="secondary" className="text-xs px-1.5 py-0">Exceptions only</Badge>}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none w-28" onClick={() => toggleSort('employeeCode')}>
                    <div className="flex items-center gap-1 text-xs font-semibold">Code <SortIcon k="employeeCode" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('employeeName')}>
                    <div className="flex items-center gap-1 text-xs font-semibold">Name <SortIcon k="employeeName" /></div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Dept.</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1 text-xs font-semibold">Date <SortIcon k="date" /></div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold">In Time</TableHead>
                  <TableHead className="text-xs font-semibold">Out Time</TableHead>
                  <TableHead className="text-xs font-semibold">Hrs</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-1 text-xs font-semibold">Status <SortIcon k="status" /></div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Late</TableHead>
                  <TableHead className="text-xs font-semibold w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground text-sm">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((record) => (
                    <TableRow
                      key={record.id}
                      className={`${getRowClass(record.status)} hover:bg-muted/30 text-xs ${selected.has(record.id) ? 'bg-accent/30' : ''}`}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.has(record.id)}
                          onCheckedChange={() => toggleSelect(record.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{record.employeeCode}</TableCell>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell className="text-muted-foreground">{record.department}</TableCell>
                      <TableCell>
                        {format(new Date(record.date), 'dd MMM')}
                        <span className="text-muted-foreground ml-1 text-[11px]">
                          {format(new Date(record.date), 'EEE')}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">{record.inTime || <span className="text-muted-foreground/50">—</span>}</TableCell>
                      <TableCell className="font-mono">{record.outTime || <span className="text-muted-foreground/50">—</span>}</TableCell>
                      <TableCell className="font-mono">{record.workingHours || <span className="text-muted-foreground/50">—</span>}</TableCell>
                      <TableCell><StatusBadge status={record.status} /></TableCell>
                      <TableCell>
                        {record.isLate ? (
                          <span className="text-[11px] font-medium text-status-late">Yes</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={finStatus !== 'Draft'}
                          onClick={() => setEditRecord(record)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AttendanceEditModal
        record={editRecord}
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        onSave={handleSave}
      />
      <BulkActionModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </AppLayout>
  );
}
