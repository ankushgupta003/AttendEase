import { useState } from 'react';
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockEmployees as initialEmployees, departments } from '@/data/mockData';
import { Employee } from '@/types';

const shifts = ['General', 'Morning', 'Night', 'Afternoon'];

export default function EmployeesPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.code.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (emp: Employee) => { setEditEmp({ ...emp }); setIsNew(false); };
  const openNew = () => {
    setEditEmp({ id: String(Date.now()), code: '', name: '', department: 'Engineering', shift: 'General', active: true, email: '', designation: '' });
    setIsNew(true);
  };

  const handleSave = () => {
    if (!editEmp) return;
    if (isNew) setEmployees(prev => [...prev, editEmp]);
    else setEmployees(prev => prev.map(e => e.id === editEmp.id ? editEmp : e));
    setEditEmp(null);
  };

  const toggleActive = (id: string) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const activeCount = employees.filter(e => e.active).length;

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

        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b">
                {['Code', 'Name', 'Designation', 'Department', 'Shift', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No employees found</td></tr>
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
                  <td className="px-4 py-3 text-muted-foreground">{emp.designation}</td>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditEmp(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{isNew ? 'Add Employee' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
