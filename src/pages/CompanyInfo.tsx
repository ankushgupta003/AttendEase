import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPatch } from '@/lib/api';
import { getInitialMonth, persistMonth } from '@/lib/month';

type CompanyInfo = {
  name: string;
  gstNumber: string;
  pfNumber: string;
  esiNumber: string;
  phone: string;
  email: string;
  website: string;
  address: string;
};

const initialCompanyInfo: CompanyInfo = {
  name: '',
  gstNumber: '',
  pfNumber: '',
  esiNumber: '',
  phone: '',
  email: '',
  website: '',
  address: '',
};

export default function CompanyInfoPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialCompanyInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    apiGet<CompanyInfo | null>("/company-info")
      .then((data) => {
        if (data) {
          setCompanyInfo({
            name: data.name ?? '',
            gstNumber: data.gstNumber ?? '',
            pfNumber: data.pfNumber ?? '',
            esiNumber: data.esiNumber ?? '',
            phone: data.phone ?? '',
            email: data.email ?? '',
            website: data.website ?? '',
            address: data.address ?? '',
          });
        }
      })
      .catch(() => {
        toast({ title: 'Unable to load company information.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch<CompanyInfo>("/company-info", companyInfo);
      toast({ title: 'Company details saved', description: 'Report exports will use the updated information.' });
    } catch {
      toast({ title: 'Save failed', description: 'Unable to save company information.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout title="Company Info" selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Company Information</h2>
            <p className="text-sm text-muted-foreground">Add company metadata used in report exports and billing documents.</p>
          </div>
          <Button onClick={handleSave} disabled={loading || saving} className="h-9 text-sm">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Enter company name"
                  value={companyInfo.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gst-number">GST Number</Label>
                  <Input
                    id="gst-number"
                    placeholder="GSTIN"
                    value={companyInfo.gstNumber}
                    onChange={(event) => updateField('gstNumber', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pf-number">PF Number</Label>
                  <Input
                    id="pf-number"
                    placeholder="Provident Fund number"
                    value={companyInfo.pfNumber}
                    onChange={(event) => updateField('pfNumber', event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="esi-number">ESI Number</Label>
                  <Input
                    id="esi-number"
                    placeholder="ESI number"
                    value={companyInfo.esiNumber}
                    onChange={(event) => updateField('esiNumber', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={companyInfo.website}
                    onChange={(event) => updateField('website', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={companyInfo.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@example.com"
                    value={companyInfo.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea
                  id="company-address"
                  placeholder="Company address for report headers"
                  value={companyInfo.address}
                  onChange={(event) => updateField('address', event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
