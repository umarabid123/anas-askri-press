import { useState, useEffect, useRef } from 'react'
import { toast } from '@/stores/toast.store'
import { Check, Image as ImageIcon, Loader2, Printer, QrCode, Save, Store, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { PageTitle, SectionTitle } from '@/components/ui/Typography'
import {
  getBusinessSettings,
  updateBusinessSettings,
  DEFAULT_SETTINGS,
} from '@/services/sqlite.service'
import type { BusinessSettings } from '@/types'

import { DataSafetyPanel } from '../components/DataSafetyPanel'

export function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const qrInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

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
      toast.success('Shop settings saved successfully.')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save settings. Please try again.'
      setErrorMessage(message); toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettings(prev => ({ ...prev, qrCodePath: reader.result as string }))
        toast.success('QR Code image selected. Click Save Settings to apply.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettings(prev => ({ ...prev, logoPath: reader.result as string }))
        toast.success('Logo image selected. Click Save Settings to apply.')
      }
    }
    reader.readAsDataURL(file)
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageTitle>Shop &amp; System Settings</PageTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure shop letterhead details, online payment QR code, invoice numbering, and data backups
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <Check className="w-4 h-4" />
              Settings Saved
            </span>
          )}
          <Button type="submit" disabled={isSaving} className="bg-blue-700 hover:bg-blue-800">
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
        <div className="flex flex-wrap items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Store className="w-4 h-4 text-blue-600" />
          <SectionTitle>Shop &amp; Letterhead Information</SectionTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Shop / Business Name"
            value={settings.businessName}
            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
            required
          />
          <Input
            label="Owner / Contact Person Name"
            placeholder="e.g. Ali Asghar"
            value={settings.ownerName || ''}
            onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
          />
          <Input
            label="Phone Number(s)"
            placeholder="03007973059"
            value={settings.phone}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            required
          />
          <Input
            label="Email Address"
            placeholder="e.g. barkatarkipress@outlook.com"
            value={settings.email || ''}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
          />
          <Input
            label="Tagline / Subtitle"
            value={settings.subtitle}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
          />
          <Input
            label="Currency Code"
            value={settings.currency}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
          />
        </div>

        <Textarea
          label="Shop Address / Location"
          placeholder="Dhuddiwala, Lower Canal Road, Near Askari Bank, Jaranwala Road, Faisalabad, Pakistan."
          value={settings.address}
          onChange={(e) => setSettings({ ...settings, address: e.target.value })}
          rows={2}
          required
        />
      </Card>

      {/* Pay Online QR Code Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <QrCode className="w-4 h-4 text-amber-600" />
          <SectionTitle>Pay Online QR Code</SectionTitle>
        </div>
        <p className="text-xs text-slate-500">
          Upload your Raast, JazzCash, EasyPaisa, or Bank QR Code image to appear directly on the bill for customers to scan and pay online.
        </p>

        <div className="flex flex-wrap items-center gap-5 pt-1">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-1 shadow-inner">
            {settings.qrCodePath ? (
              <img src={settings.qrCodePath} alt="Custom QR Code" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-2">
                <QrCode className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block font-medium">Default QR</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              type="file"
              ref={qrInputRef}
              onChange={handleQrUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => qrInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{settings.qrCodePath ? 'Replace QR Code Image' : 'Upload QR Code Image'}</span>
              </Button>
              {settings.qrCodePath && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettings(prev => ({ ...prev, qrCodePath: '' }))}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Custom QR</span>
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Supported formats: PNG, JPG, WebP. Recommended: Square image (e.g. 500x500).</p>
          </div>
        </div>
      </Card>

      {/* Shop Logo Setup */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <ImageIcon className="w-4 h-4 text-blue-600" />
          <SectionTitle>Shop Logo Image</SectionTitle>
        </div>
        <p className="text-xs text-slate-500">
          Customize the logo shown on the upper side of the bill letterhead.
        </p>

        <div className="flex flex-wrap items-center gap-5 pt-1">
          <div className="w-32 h-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-2 shadow-xs">
            <img
              src={settings.logoPath || '/logo.png'}
              alt="Shop Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-2">
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Logo</span>
              </Button>
              {settings.logoPath && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettings(prev => ({ ...prev, logoPath: '' }))}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset to Default Logo</span>
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Supported formats: PNG, JPG, WebP.</p>
          </div>
        </div>
      </Card>

      {/* Invoice & Printing Formats */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Printer className="w-4 h-4 text-blue-600" />
          <SectionTitle>Invoice &amp; Printing Setup</SectionTitle>
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
