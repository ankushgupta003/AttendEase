import { useEffect, useState } from 'react';
import { AttendanceRecord, AttendanceStatus, LeaveType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/common/StatusBadge';
import { apiGet } from '@/lib/api';

const statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Half Day', 'Missing Punch', 'Week Off', 'Holiday', 'Leave'];

interface AttendanceEditModalProps {
  record: AttendanceRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: AttendanceRecord) => void;
}

export function AttendanceEditModal({ record, open, onClose, onSave }: AttendanceEditModalProps) {
  const [inTime, setInTime] = useState(record?.inTime || '');
  const [outTime, setOutTime] = useState(record?.outTime || '');
  const [status, setStatus] = useState<AttendanceStatus>(record?.status || 'Present');
  const [isLate, setIsLate] = useState(record?.isLate || false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeCode, setLeaveTypeCode] = useState(record?.leaveTypeCode || '');

  useEffect(() => {
    if (!record) return;
    setInTime(record.inTime || '');
    setOutTime(record.outTime || '');
    setStatus(record.status || 'Present');
    setIsLate(record.isLate || false);
    setLeaveTypeCode(record.leaveTypeCode || '');
  }, [record]);

  useEffect(() => {
    if (!open) return;
    apiGet<LeaveType[]>("/leave-types")
      .then(setLeaveTypes)
      .catch(() => setLeaveTypes([]));
  }, [open]);

  useEffect(() => {
    if (status !== 'Leave') return;
    if (leaveTypeCode) return;
    const first = leaveTypes[0]?.code;
    if (first) setLeaveTypeCode(first);
  }, [status, leaveTypeCode, leaveTypes]);

  useEffect(() => {
    if (status !== 'Leave') return;
    setInTime('');
    setOutTime('');
    setIsLate(false);
  }, [status]);

  const handleSave = () => {
    const diff = (() => {
      if (!inTime || !outTime) return '0:00';
      const [ih, im] = inTime.split(':').map(Number);
      const [oh, om] = outTime.split(':').map(Number);
      const d = (oh * 60 + om) - (ih * 60 + im);
      if (d <= 0) return '0:00';
      return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
    })();
    onSave({
      ...record,
      inTime,
      outTime,
      status,
      isLate,
      workingHours: diff,
      leaveTypeCode: status === 'Leave' ? leaveTypeCode : null
    });
    onClose();
  };

  return (
    record ? (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-xs text-muted-foreground">Employee</p>
              <p className="text-sm font-medium">{record.employeeName}</p>
              <p className="text-xs text-muted-foreground">{record.employeeCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium">{new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <StatusBadge status={record.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inTime">In Time</Label>
              <Input
                id="inTime"
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                disabled={status === 'Leave'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outTime">Out Time</Label>
              <Input
                id="outTime"
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                disabled={status === 'Leave'}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === 'Leave' && (
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              {leaveTypes.length ? (
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
              ) : (
                <p className="text-xs text-muted-foreground">No leave types configured.</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <Label>Mark as Late</Label>
              <p className="text-xs text-muted-foreground">Override late status</p>
            </div>
            <Switch checked={isLate} onCheckedChange={setIsLate} disabled={status === 'Leave'} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={status === 'Leave' && !leaveTypeCode}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    ) : null
  );
}
