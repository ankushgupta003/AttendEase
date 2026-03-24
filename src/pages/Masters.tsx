import { useState } from 'react';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { mockShifts, mockHolidays, mockLeaveTypes } from '@/data/mockData';
import { Shift, Holiday, LeaveType } from '@/types';

export default function MastersPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [holidays, setHolidays] = useState<Holiday[]>(mockHolidays);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(mockLeaveTypes);

  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [editLeave, setEditLeave] = useState<LeaveType | null>(null);

  const saveShift = () => {
    if (!editShift) return;
    setShifts(prev => prev.find(s => s.id === editShift.id)
      ? prev.map(s => s.id === editShift.id ? editShift : s)
      : [...prev, { ...editShift, id: String(Date.now()) }]);
    setEditShift(null);
  };

  const saveHoliday = () => {
    if (!editHoliday) return;
    setHolidays(prev => prev.find(h => h.id === editHoliday.id)
      ? prev.map(h => h.id === editHoliday.id ? editHoliday : h)
      : [...prev, { ...editHoliday, id: String(Date.now()) }]);
    setEditHoliday(null);
  };

  const saveLeave = () => {
    if (!editLeave) return;
    setLeaveTypes(prev => prev.find(l => l.id === editLeave.id)
      ? prev.map(l => l.id === editLeave.id ? editLeave : l)
      : [...prev, { ...editLeave, id: String(Date.now()) }]);
    setEditLeave(null);
  };

  return (
    <AppLayout title="Master Data" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Master Configuration</h2>

        <Tabs defaultValue="shifts" className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="shifts" className="text-xs">Shifts</TabsTrigger>
            <TabsTrigger value="holidays" className="text-xs">Holidays</TabsTrigger>
            <TabsTrigger value="leave" className="text-xs">Leave Types</TabsTrigger>
          </TabsList>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Shift Definitions</CardTitle>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditShift({ id: '', name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15 })}>
                    <Plus className="h-3 w-3" /> Add Shift
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shifts.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors">
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.startTime} – {s.endTime}</p>
                        <p className="text-xs text-muted-foreground">Grace: {s.graceMinutes} mins</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditShift(s)}>
                        <Pencil className="h-3.5 w-3.5" />
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
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Upload className="h-3 w-3" /> Upload Excel
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Download className="h-3 w-3" /> Template
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditHoliday({ id: '', name: '', date: '', type: 'National' })}>
                      <Plus className="h-3 w-3" /> Add Holiday
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
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
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditHoliday(h)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setHolidays(prev => prev.filter(x => x.id !== h.id))}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditLeave({ id: '', name: '', code: '', paidLeave: true, maxDays: 0 })}>
                    <Plus className="h-3 w-3" /> Add Leave Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditLeave(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
