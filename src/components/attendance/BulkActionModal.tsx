import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { apiGet, apiPost } from '@/lib/api';
import type { LeaveType } from '@/types';

interface BulkActionModalProps {
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
  employees?: { code: string; name: string; department: string }[];
  selectedIds?: string[];
}

type BulkAction = 'mark-leave' | 'mark-present' | 'change-shift' | 'fix-missing';

const actionOptions = [
  { value: 'mark-leave', label: 'Mark Leave' },
  { value: 'mark-present', label: 'Mark Present' },
  { value: 'change-shift', label: 'Change Shift' },
  { value: 'fix-missing', label: 'Fix Missing Punch' },
];

export function BulkActionModal({ open, onClose, onApplied, employees: employeesProp }: BulkActionModalProps) {
  const [action, setAction] = useState<BulkAction>('mark-present');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<{ code: string; name: string; department: string }[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [shift, setShift] = useState('General');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeCode, setLeaveTypeCode] = useState('');

  const toggleEmployee = (code: string) => {
    setSelectedEmployees(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.code));
    }
  };

  useEffect(() => {
    if (!open) return;
    if (employeesProp && employeesProp.length) {
      setEmployees(employeesProp);
      return;
    }
    apiGet<{ code: string; name: string; department: string }[]>("/employees")
      .then((rows) => setEmployees(rows))
      .catch(() => setEmployees([]));
  }, [open, employeesProp]);

  useEffect(() => {
    if (!open) return;
    apiGet<LeaveType[]>("/leave-types")
      .then((rows) => {
        setLeaveTypes(rows);
        if (rows.length && !leaveTypeCode) setLeaveTypeCode(rows[0].code);
      })
      .catch(() => setLeaveTypes([]));
  }, [open, leaveTypeCode]);

  const handleApply = async () => {
    await apiPost("/attendance/bulk", {
      action,
      employeeCodes: selectedEmployees,
      dateFrom,
      dateTo,
      shiftName: shift,
      leaveTypeCode: action === 'mark-leave' ? leaveTypeCode : undefined
    });
    onClose();
    onApplied?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription>Apply changes to multiple employees across a date range.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as BulkAction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {action === 'change-shift' && (
            <div className="space-y-1.5">
              <Label>New Shift</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['General', 'Morning', 'Night', 'Afternoon'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {action === 'mark-leave' && (
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={leaveTypeCode} onValueChange={setLeaveTypeCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.code} value={lt.code}>{lt.name} ({lt.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Employees</Label>
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {employees.map(emp => (
                <div key={emp.code} className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-muted/50">
                  <Checkbox
                    id={emp.code}
                    checked={selectedEmployees.includes(emp.code)}
                    onCheckedChange={() => toggleEmployee(emp.code)}
                  />
                  <Label htmlFor={emp.code} className="cursor-pointer flex-1">
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-muted-foreground text-xs ml-2">{emp.code}</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">{emp.department}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedEmployees.length > 0 && (
            <p className="text-xs text-muted-foreground bg-accent/50 rounded px-2 py-1.5">
              {selectedEmployees.length} employee(s) selected
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={
              selectedEmployees.length === 0 ||
              !dateFrom ||
              !dateTo ||
              (action === 'mark-leave' && !leaveTypeCode)
            }
          >
            Apply to {selectedEmployees.length || 0} Employee(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
