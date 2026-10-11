import { useState } from 'react'
import { Download, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { Button } from './Button'
import {
  type UpdateCheckResult,
  type UpdateDownloadProgress,
  downloadAndApplyUpdate,
} from '@/services/updater.service'
import { toast } from '@/stores/toast.store'

interface UpdateModalProps {
  updateInfo: UpdateCheckResult
  onClose: () => void
}

export function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [progress, setProgress] = useState<UpdateDownloadProgress | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleStartUpdate = async () => {
    if (!updateInfo.newVersion) return
    setIsUpdating(true)
    setErrorMessage(null)

    const result = await downloadAndApplyUpdate(updateInfo.newVersion, (p) => {
      setProgress(p)
    })

    if (!result.success) {
      setIsUpdating(false)
      const err = result.error || 'Failed to apply update'
      setErrorMessage(err)
      toast.error(err)
    } else {
      setIsDone(true)
      toast.success('Update ready! Pre-update safety backup saved.')
    }
  }

  const formatMb = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-700/80 rounded-xl">
                <RefreshCw className={`w-5 h-5 text-white ${isUpdating && !isDone ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white leading-tight">Software Update Available</h3>
                {updateInfo.newVersion && (
                  <p className="text-xs text-blue-100 mt-0.5 font-medium">Version {updateInfo.newVersion}</p>
                )}
              </div>
            </div>
            {!isUpdating && (
              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-blue-700/50 transition-colors"
                aria-label="Close update modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Zero Data Loss Guarantee Notice */}
          <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-emerald-900">Zero Data Loss Protection</span>
              Your invoices, customers, and business data are 100% safe. An automatic safety snapshot will be created before updating.
            </div>
          </div>

          {/* Release Notes */}
          {updateInfo.body && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What's New</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {updateInfo.body}
              </div>
            </div>
          )}

          {/* Progress Section */}
          {isUpdating && progress && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>{progress.isInstalling ? 'Installing & Relaunching...' : 'Downloading update...'}</span>
                <span>
                  {progress.totalBytes > 0
                    ? `${formatMb(progress.downloadedBytes)} MB / ${formatMb(progress.totalBytes)} MB (${progress.percentage}%)`
                    : `${progress.percentage}%`}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-xs p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {errorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            {isDone ? (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-medium">
                  ✓ Safety backup verified & stored in AppData.
                </span>
                <Button type="button" onClick={onClose}>
                  Done
                </Button>
              </div>
            ) : !isUpdating ? (
              <>
                <Button type="button" variant="outline" onClick={onClose}>
                  Later
                </Button>
                <Button type="button" onClick={handleStartUpdate} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Update Now
                </Button>
              </>
            ) : (
              <span className="text-xs text-slate-500 italic">Please keep the application open...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
