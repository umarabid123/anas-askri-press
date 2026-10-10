import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().trim().min(10, 'Valid phone number is required (e.g. 03001234567)'),
  address: z.string().trim().optional(),
  openingBalance: z.number().nonnegative('Opening balance cannot be negative').default(0).optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

export const saleItemSchema = z.object({
  itemName: z.string().trim().min(1, 'Item name or description is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  rate: z.number().nonnegative('Rate must be a non-negative number'),
})

export type SaleItemFormData = z.infer<typeof saleItemSchema>

export const saleSchema = z.object({
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerMobile: z.string().nullable().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  discount: z.number().nonnegative().default(0),
  paidAmount: z.number().nonnegative(),
  paymentMethod: z.enum(['cash', 'bank']),
  notes: z.string().optional(),
})

export type SaleFormData = z.infer<typeof saleSchema>

export const mazdooriSchema = z.object({
  mazdoorId: z.string().min(1, 'Please select or enter a worker name'),
  mazdoorName: z.string().min(1, 'Worker name is required'),
  workDate: z.string().min(1, 'Work date is required'),
  workDetail: z.string().min(1, 'Work detail is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paidAmount: z.number().nonnegative('Paid amount must be 0 or more'),
  notes: z.string().optional(),
})

export type MazdooriFormData = z.infer<typeof mazdooriSchema>
