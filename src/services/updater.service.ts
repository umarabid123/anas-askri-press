import { isTauri } from '@/services/sqlite.service'
import { invoke } from '@tauri-apps/api/core'
import type { DownloadEvent } from '@tauri-apps/plugin-updater'

export interface UpdateCheckResult {
  available: boolean
  currentVersion: string
  newVersion?: string
  date?: string
  body?: string
  error?: string
}

export interface UpdateDownloadProgress {
  percentage: number
  downloadedBytes: number
  totalBytes: number
  isInstalling: boolean
}

export const APP_VERSION = '1.0.1'

// Keep active update reference in memory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeUpdateRef: any = null

export async function checkAppUpdate(): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return {
      available: false,
      currentVersion: APP_VERSION,
    }
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()

    if (update) {
      activeUpdateRef = update
      return {
        available: true,
        currentVersion: update.currentVersion,
        newVersion: update.version,
        date: update.date,
        body: update.body || 'New enhancements and stability improvements.',
      }
    }

    return {
      available: false,
      currentVersion: APP_VERSION,
    }
  } catch (err) {
    const raw = (err instanceof Error ? err.message : String(err)).toLowerCase()

    // If no release has been published to GitHub yet (404 / no release JSON), the app is up to date
    if (
      raw.includes('could not fetch a valid release json') ||
      raw.includes('404') ||
      raw.includes('not found') ||
      raw.includes('no updates')
    ) {
      return {
        available: false,
        currentVersion: APP_VERSION,
      }
    }

    // Friendly offline / internet connection message
    if (
      raw.includes('failed to fetch') ||
      raw.includes('network') ||
      raw.includes('timeout') ||
      raw.includes('dns') ||
      raw.includes('connect')
    ) {
      return {
        available: false,
        currentVersion: APP_VERSION,
        error: 'Unable to reach the update server. Please check your internet connection.',
      }
    }

    return {
      available: false,
      currentVersion: APP_VERSION,
      error: 'Unable to check for updates right now. Please try again later.',
    }
  }
}

export async function downloadAndApplyUpdate(
  targetVersion: string,
  onProgress?: (progress: UpdateDownloadProgress) => void
): Promise<{ success: boolean; backupFile?: string; error?: string }> {
  if (!isTauri()) {
    return { success: false, error: 'App updates are only supported in the desktop application.' }
  }

  if (!activeUpdateRef) {
    const res = await checkAppUpdate()
    if (!res.available || !activeUpdateRef) {
      return { success: false, error: 'No update package is currently available.' }
    }
  }

  try {
    // 1. Zero-Data-Loss Safety Guard:
    // Create an automatic safety backup of the database before touching binaries
    let backupFile: string | undefined
    try {
      backupFile = await invoke<string>('create_pre_update_backup', { targetVersion })
    } catch (backupErr) {
      console.warn('Pre-update safety backup warning:', backupErr)
    }

    // 2. Download updater package with progress callback
    let totalBytes = 0
    let downloadedBytes = 0

    await activeUpdateRef.download((event: DownloadEvent) => {
      if (event.event === 'Started') {
        totalBytes = event.data.contentLength || 0
        onProgress?.({
          percentage: 0,
          downloadedBytes: 0,
          totalBytes,
          isInstalling: false,
        })
      } else if (event.event === 'Progress') {
        downloadedBytes += event.data.chunkLength
        const percentage = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0
        onProgress?.({
          percentage,
          downloadedBytes,
          totalBytes,
          isInstalling: false,
        })
      } else if (event.event === 'Finished') {
        onProgress?.({
          percentage: 100,
          downloadedBytes,
          totalBytes,
          isInstalling: true,
        })
      }
    })

    // 3. Install the update package
    onProgress?.({
      percentage: 100,
      downloadedBytes,
      totalBytes,
      isInstalling: true,
    })

    await activeUpdateRef.install()

    // 4. Relaunch the application into the new version
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()

    return { success: true, backupFile }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
