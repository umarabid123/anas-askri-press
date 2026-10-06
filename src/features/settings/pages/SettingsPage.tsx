import { useState, useEffect } from 'react'
import { Check, Loader2, Printer, Save, Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { PageTitle, SectionTitle } from '@/components/ui/Typography'
import {
  getBusinessSettings,
  updateBusinessSettings,
} from '@/services/sqlite.service'
import type { BusinessSettings } from '@/types'

import { DataSafetyPanel } from '../components/DataSafetyPanel'

export function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>({
    id: 'default',
    businessName: 'ANAS ARKI PRESS & LASER CUTTING',
    subtitle: 'PRECISION | QUALITY | YOUR VISION OUR WORK',
    phone: '0300-7973059',
    address: 'Dhuddi wala Lower Canal Near Askari Bandk Main Jaranwala Road',
    invoicePrefix: 'ARKI',
    nextInvoiceNumber: 1001,
    receiptPaperSize: 'A4',
    footerText: 'Thank you for your business!',
    showLogo: true,
    currency: 'PKR',
    currencySymbol: 'Rs',
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const data = await getBusinessSettings()
        if (data) {
          setSettings(data)
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    setErrorMessage(null)

    try {
      const updated = await updateBusinessSettings(settings)
      setSettings(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <PageTitle>Shop & System Settings</PageTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure shop letterhead details, invoice numbering, printing format, and data backups
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <Check className="w-4 h-4" />
              Settings Saved
            </span>
          )}
          <Button type="submit" disabled={isSaving} className="bg-[#1877F2] hover:bg-blue-600">
            {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save Settings
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Business Information */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Store className="w-4 h-4 text-blue-600" />
          <SectionTitle>Shop & Letterhead Information</SectionTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Shop / Business Name"
            value={settings.businessName}
            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
            required
          />
          <Input
            label="Tagline / Subtitle"
            value={settings.subtitle}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
          />
          <Input
            label="Phone Number(s)"
            placeholder="0300-7973059"
            value={settings.phone}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            required
          />
          <Input
            label="Currency Code"
            value={settings.currency}
            onChange={(e) => {
              const val = e.target.value
              setSettings({ ...settings, currency: val })
            }}
          />
        </div>

        <Textarea
          label="Shop Address / Location"
          placeholder="Dhuddi wala Lower Canal Near Askari Bandk Main Jaranwala Road"
          value={settings.address}
          onChange={(e) => setSettings({ ...settings, address: e.target.value })}
          rows={2}
          required
        />
      </Card>

      {/* Invoice & Printing Formats */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Printer className="w-4 h-4 text-blue-600" />
          <SectionTitle>Invoice & Printing Setup</SectionTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Invoice Prefix"
            value={settings.invoicePrefix}
            onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value.toUpperCase() })}
            required
          />
          <Input
            label="Next Invoice Sequence #"
            min={1}
            step={1}
            type="number"
            value={settings.nextInvoiceNumber}
            onChange={(e) => setSettings({ ...settings, nextInvoiceNumber: parseInt(e.target.value) || 1001 })}
            required
          />
          <Select
            label="Default Paper Size"
            value={settings.receiptPaperSize}
            onChange={(e) =>
              setSettings({
                ...settings,
                receiptPaperSize: e.target.value as '80mm' | '58mm' | 'A4',
              })
            }
            options={[
              { value: 'A4', label: 'A4 Sheet / Shop Pad (Standard)' },
              { value: '80mm', label: '80mm Thermal Receipt' },
              { value: '58mm', label: '58mm Mini Receipt' },
            ]}
          />
        </div>

        <Input
          label="Invoice Footer Note"
          value={settings.footerText}
          onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
        />
      </Card>

      <DataSafetyPanel />
    </form>
  )
}
