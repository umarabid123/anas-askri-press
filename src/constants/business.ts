export const BUSINESS_INFO = {
  name: 'Anas Arki Press',
  subtitle: 'Chadar • Dabi • Chogat • Banding • Cutting',
  defaultPhone: '03007973059',
  defaultAddress: 'Dhuddiwala, Lower Canal Road, Near Askari Bank, Jaranwala Road, Faisalabad, Pakistan.',
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
  'Banding',
  'Cutting',
] as const
