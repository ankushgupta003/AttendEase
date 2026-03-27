import { useEffect, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiDownload, apiGet, apiPostForm } from '@/lib/api';
import { getInitialMonth, persistMonth } from '@/lib/month';

type PreviewRow = { code: string; date: string; inTime: string; outTime: string; status: string };

const columnOptions = ['Employee Code', 'Employee Name', 'Date', 'In Time', 'Out Time', 'Ignore'];

export default function UploadPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<{ processed: number; exceptions: number } | null>(null);
  const [holidays, setHolidays] = useState<{ id: string; name: string; date: string }[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    A: 'Employee Code', B: 'Date', C: 'In Time', D: 'Out Time',
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setStep('map');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const monthPrefix = `${selectedMonth}-`;
  const monthHolidays = holidays.filter((h) => h.date.startsWith(monthPrefix));

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    apiGet<{ id: string; name: string; date: string }[]>("/holidays")
      .then(setHolidays)
      .catch(() => setHolidays([]));
  }, []);

  return (
    <AppLayout title="Upload Attendance" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="max-w-3xl space-y-5">
        <div className="flex items-center gap-2">
          {(['upload', 'map', 'preview', 'done'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs ${step === s ? 'text-primary font-semibold' : i < ['upload', 'map', 'preview', 'done'].indexOf(step) ? 'text-status-present' : 'text-muted-foreground'}`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-primary text-primary-foreground' : i < ['upload', 'map', 'preview', 'done'].indexOf(step) ? 'bg-status-present-bg text-status-present' : 'bg-muted text-muted-foreground'}`}>
                  {i < ['upload', 'map', 'preview', 'done'].indexOf(step) ? 'OK' : i + 1}
                </div>
                <span className="capitalize hidden sm:block">{s === 'done' ? 'Complete' : s}</span>
              </div>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        {step === 'upload' && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Upload Attendance File</CardTitle>
              <CardDescription>Upload an Excel (.xlsx, .xls) or CSV file containing attendance data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-primary bg-accent/50' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center">
                    <FileSpreadsheet className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drop your file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv - Max 10MB</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">Choose File</Button>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold">Expected Format</p>
                <p className="text-xs text-muted-foreground">
                  Use the Schedule block format: header rows with ID, Name, Dept, Shift, Date range,
                  followed by daily rows with time cells (first time = In, last time = Out).
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs h-auto p-0 text-primary"
                  onClick={async () => {
                    const blob = await apiDownload("/attendance/template");
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "attendance_template.xlsx";
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                >
                  Download Template &gt;
                </Button>
              </div>

              {monthHolidays.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="text-xs font-semibold mb-2">Holidays This Month</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {monthHolidays.map((h) => (
                      <li key={h.id}>
                        {h.date}: {h.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'map' && file && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Map Columns</CardTitle>
                  <CardDescription>Match your file's columns to the required fields.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  {file.name}
                  <button onClick={() => { setFile(null); setStep('upload'); }} className="hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(mapping).map(([col, val]) => (
                  <div key={col} className="space-y-1.5">
                    <Label className="text-xs">Column {col}</Label>
                    <Select value={val} onValueChange={(v) => setMapping(prev => ({ ...prev, [col]: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columnOptions.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>Back</Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!file) return;
                    const form = new FormData();
                    form.append("file", file);
                    form.append("mapping", JSON.stringify(mapping));
                    const res = await apiPostForm<{ preview: PreviewRow[] }>("/attendance/upload/preview", form);
                    setPreviewRows(res.preview);
                    setStep('preview');
                  }}
                >
                  Preview Data &gt;
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'preview' && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Preview Data</CardTitle>
              <CardDescription>Review the parsed data before processing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border">
                <div className="w-full overflow-x-auto">
                  <table className="w-max text-xs min-w-[520px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      {['Employee Code', 'Date', 'In Time', 'Out Time', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2 font-mono font-medium">{row.code}</td>
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2 font-mono">{row.inTime || <span className="text-destructive">Missing</span>}</td>
                        <td className="px-3 py-2 font-mono">{row.outTime || <span className="text-destructive">Missing</span>}</td>
                        <td className="px-3 py-2">
                          {row.status === "Week Off" || row.status === "Holiday" ? (
                            <span className="status-present inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium">
                              {row.status}
                            </span>
                          ) : (!row.inTime || !row.outTime) ? (
                            <span className="status-missing inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium">
                              <AlertCircle className="h-3 w-3" /> Missing Punch
                            </span>
                          ) : (
                            <span className="status-present inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium">
                              <CheckCircle2 className="h-3 w-3" /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-status-missing flex-shrink-0" />
                <span>Missing punches will be flagged for review.</span>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setStep('map')}>Back</Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!file) return;
                    const form = new FormData();
                    form.append("file", file);
                    form.append("mapping", JSON.stringify(mapping));
                    const res = await apiPostForm<{ summary: { processed: number; exceptions: number } }>("/attendance/upload", form);
                    setSummary(res.summary);
                    setStep('done');
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Process Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-status-present-bg flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-status-present" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Upload Successful!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary ? `${summary.processed} records processed · ${summary.exceptions} exceptions flagged` : 'Upload completed'}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => { setStep('upload'); setFile(null); }}>
                  Upload Another
                </Button>
                <Button size="sm" onClick={() => window.location.href = '/attendance'}>
                  Go to Attendance &gt;
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}



