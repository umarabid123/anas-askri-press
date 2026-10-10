export const BUSINESS_INFO = {
  name: 'Anas Arki Press & Laser Cutting',
  subtitle: 'Chadar • Dabi • Chogat • Laser Cutting • CNC Cutting',
  defaultPhone: '',
  defaultAddress: '',
  currency: 'PKR',
  currencySymbol: 'Rs',
} as const

export const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK: 'bank',
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
} as const

export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS]

export const DEFAULT_SERVICES = [
  'Chadar',
  'Dabi',
  'Chogat',
  'Laser Cutting',
  'CNC Cutting',
] as const
