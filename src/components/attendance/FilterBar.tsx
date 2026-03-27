import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AttendanceStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Half Day', 'Missing Punch', 'Week Off', 'Holiday', 'Leave'];

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  department: string;
  onDepartmentChange: (v: string) => void;
  departments: string[];
  status: string;
  onStatusChange: (v: string) => void;
  showExceptionsOnly: boolean;
  onToggleExceptions: () => void;
  className?: string;
}

export function FilterBar({
  search, onSearchChange,
  department, onDepartmentChange,
  departments,
  status, onStatusChange,
  showExceptionsOnly, onToggleExceptions,
  className,
}: FilterBarProps) {
  const hasFilters = search || (department && department !== 'all') || (status && status !== 'all');

  const clearAll = () => {
    onSearchChange('');
    onDepartmentChange('all');
    onStatusChange('all');
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search employee..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <Select value={department || 'all'} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map(d => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status || 'all'} onValueChange={onStatusChange}>
        <SelectTrigger className="w-44 h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {statusOptions.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={showExceptionsOnly ? 'default' : 'outline'}
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={onToggleExceptions}
      >
        <Filter className="h-3.5 w-3.5" />
        Exceptions Only
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearAll}>
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
