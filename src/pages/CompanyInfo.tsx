import { useEffect, useMemo, useState } from 'react';
import { Buildings, Globe, IdentificationCard, PhoneCall } from '@phosphor-icons/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  address: ''
};

export default function CompanyInfoPage() {
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialCompanyInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    apiGet<CompanyInfo | null>('/company-info')
      .then((data) => {
        if (!data) return;
        setCompanyInfo({
          name: data.name ?? '',
          gstNumber: data.gstNumber ?? '',
          pfNumber: data.pfNumber ?? '',
          esiNumber: data.esiNumber ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          website: data.website ?? '',
          address: data.address ?? ''
        });
      })
      .catch(() => {
        toast({ title: 'Unable to load company information.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    persistMonth(selectedMonth);
  }, [selectedMonth]);

  const updateField = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
  };

  const isDirty = useMemo(() => {
    return Object.values(companyInfo).some((value) => String(value || '').trim().length > 0);
  }, [companyInfo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch<CompanyInfo>('/company-info', companyInfo);
      toast({ title: 'Company details saved', description: 'Report exports will use the updated information.' });
    } catch {
      toast({ title: 'Save failed', description: 'Unable to save company information.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title='Company Info' selectedMonth={selectedMonth} onMonthChange={setSelectedMonth}>
      <div className='ui-page'>
        <div className='rounded-2xl border bg-gradient-to-r from-white to-muted/40 p-5 md:p-6'>
          <div className='flex items-start gap-4'>
            <div className='mt-0.5 rounded-xl bg-primary/10 p-3 text-primary'>
              <Buildings className='h-5 w-5' weight='duotone' />
            </div>
            <div className='space-y-1'>
              <h2 className='text-xl font-semibold tracking-tight'>Company Information</h2>
              <p className='text-sm text-muted-foreground'>Maintain official company details used in report headers, exports, and payroll documents.</p>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-5'>
          <Card className='border-0 shadow-sm'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <Buildings className='h-4 w-4 text-primary' weight='duotone' />
                Identity & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='company-name' className='text-sm'>Company Name</Label>
                <Input
                  id='company-name'
                  className='h-11 text-sm'
                  placeholder='Enter company name'
                  value={companyInfo.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='gst-number' className='text-sm'>GST Number</Label>
                  <Input
                    id='gst-number'
                    className='h-11 text-sm'
                    placeholder='GSTIN'
                    value={companyInfo.gstNumber}
                    onChange={(event) => updateField('gstNumber', event.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='pf-number' className='text-sm'>PF Number</Label>
                  <Input
                    id='pf-number'
                    className='h-11 text-sm'
                    placeholder='Provident fund number'
                    value={companyInfo.pfNumber}
                    onChange={(event) => updateField('pfNumber', event.target.value)}
                  />
                </div>
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='esi-number' className='text-sm'>ESI Number</Label>
                  <Input
                    id='esi-number'
                    className='h-11 text-sm'
                    placeholder='ESI number'
                    value={companyInfo.esiNumber}
                    onChange={(event) => updateField('esiNumber', event.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='website' className='text-sm flex items-center gap-1.5'>
                    <Globe className='h-3.5 w-3.5 text-muted-foreground' /> Website
                  </Label>
                  <Input
                    id='website'
                    className='h-11 text-sm'
                    placeholder='https://example.com'
                    value={companyInfo.website}
                    onChange={(event) => updateField('website', event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-sm'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <IdentificationCard className='h-4 w-4 text-primary' weight='duotone' />
                Contact & Address
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='phone' className='text-sm flex items-center gap-1.5'>
                    <PhoneCall className='h-3.5 w-3.5 text-muted-foreground' /> Phone
                  </Label>
                  <Input
                    id='phone'
                    className='h-11 text-sm'
                    placeholder='+91 98765 43210'
                    value={companyInfo.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-sm'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    className='h-11 text-sm'
                    placeholder='info@example.com'
                    value={companyInfo.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='company-address' className='text-sm'>Address</Label>
                <Textarea
                  id='company-address'
                  className='min-h-[168px] text-sm'
                  placeholder='Company address for report headers'
                  value={companyInfo.address}
                  onChange={(event) => updateField('address', event.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className='border border-primary/20 bg-primary/5 shadow-none'>
          <CardContent className='py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='text-sm font-semibold'>Ready to publish these details?</p>
              <p className='text-sm text-muted-foreground'>Changes will be used immediately in exports and report headers.</p>
            </div>
            <Button onClick={handleSave} disabled={loading || saving || !isDirty} className='h-10 px-6 text-sm'>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
