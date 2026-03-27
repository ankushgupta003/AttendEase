import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@/types';

const statusConfig: Record<AttendanceStatus, { label: string; className: string }> = {
  Present: { label: 'Present', className: 'status-present' },
  Absent: { label: 'Absent', className: 'status-absent' },
  Late: { label: 'Late', className: 'status-late' },
  'Half Day': { label: 'Half Day', className: 'status-halfday' },
  'Missing Punch': { label: 'Missing Punch', className: 'status-missing' },
  'Week Off': { label: 'Week Off', className: 'status-weekoff' },
  Holiday: { label: 'Holiday', className: 'status-holiday' },
  Leave: { label: 'Leave', className: 'status-absent' },
};

interface StatusBadgeProps {
  status: AttendanceStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};

export const getRowClass = (status: AttendanceStatus): string => {
  const map: Record<AttendanceStatus, string> = {
    Present: 'row-present',
    Absent: 'row-absent',
    Late: 'row-late',
    'Half Day': 'row-halfday',
    'Missing Punch': 'row-missing',
    'Week Off': 'row-weekoff',
    Holiday: 'row-holiday',
    Leave: 'row-absent',
  };
  return map[status];
};
