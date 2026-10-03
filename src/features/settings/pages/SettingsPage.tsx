import { Database, Printer, Save, Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageTitle, SectionTitle } from '@/components/ui/Typography'
import { BUSINESS_INFO } from '@/constants/business'

export function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <PageTitle>Shop & System Settings</PageTitle>
          <p className="text-xs text-slate-500">
            Configure business information, thermal receipt printing, and backups
          </p>
        </div>
        <Button variant="primary" size="md">
          <Save className="w-4 h-4 mr-1.5" />
          Save Settings
        </Button>
      </div>

      {/* Business Info */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Store className="w-4 h-4 text-blue-600" />
          <SectionTitle>Shop Information</SectionTitle>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Shop Name" defaultValue={BUSINESS_INFO.name} />
          <Input label="Shop Subtitle" defaultValue={BUSINESS_INFO.subtitle} />
          <Input label="Phone Number" placeholder="e.g. 0300-0000000" />
          <Input label="Address" placeholder="Shop address..." />
        </div>
      </Card>

      {/* Invoice & Printer Settings */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Printer className="w-4 h-4 text-blue-600" />
          <SectionTitle>Receipt & Printing</SectionTitle>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Invoice Prefix" defaultValue="ARKI" />
          <Input label="Receipt Paper Size" defaultValue="80mm Thermal" disabled />
          <Input label="Currency" defaultValue="PKR (Rs)" disabled />
        </div>
      </Card>

      {/* Database & Cloud Backup */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Database className="w-4 h-4 text-blue-600" />
          <SectionTitle>Data & Local Backup</SectionTitle>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Local Database Backup</p>
            <p className="text-xs text-slate-500">
              Create an offline backup file (.db / .sql) of all business records
            </p>
          </div>
          <Button variant="outline" size="sm">
            Backup Database
          </Button>
        </div>
      </Card>
    </div>
  )
}
