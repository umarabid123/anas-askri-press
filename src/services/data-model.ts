import { z } from 'zod'
import { isValidDateKey } from '@/utils/financial'
export const TABLES = ['business_settings', 'customers', 'items', 'mazdoors', 'sales', 'sale_items', 'sale_item_mazdoori_tasks', 'payments', 'customer_ledger', 'mazdoori_entries', 'expenses', 'sync_queue'] as const
export type TableName = typeof TABLES[number]
// Tables added after the first v2 backups; older backups may omit them.
const OPTIONAL_TABLES: readonly TableName[] = ['expenses']
export type Row = Record<string, string | number | boolean | null>
export type Tables = Record<TableName, Row[]>
export type Backup = { format: 'arki-pos'; version: 2; exportedAt: string; tables: Tables }
const row = z.object({ id: z.string().min(1) }).catchall(z.union([z.string(), z.number().finite(), z.boolean(), z.null()]))
export function validateBackup(input: unknown): Backup {
  const data = z.object({ format: z.literal('arki-pos'), version: z.literal(2), exportedAt: z.string().datetime({ offset: true }), tables: z.record(z.string(), z.array(row)) }).strict().parse(input) as unknown as Backup
  for (const table of TABLES) {
    if (data.tables[table] === undefined && OPTIONAL_TABLES.includes(table)) data.tables[table] = []
    if (!Array.isArray(data.tables[table])) throw new Error(`Missing backup table: ${table}.`)
    const ids = data.tables[table].map(r => r.id)
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate records in ${table}.`)
  }
  if (Object.keys(data.tables).some(t => !TABLES.includes(t as TableName))) throw new Error('Unknown backup table.')
  const settings = data.tables.business_settings[0]
  if (data.tables.business_settings.length !== 1 || settings?.id !== 'default' || !settings.business_name || !settings.invoice_prefix || !Number.isSafeInteger(settings.next_invoice_number) || Number(settings.next_invoice_number) < 1) throw new Error('Invalid shop settings.')
  const references: Array<[TableName, string, TableName, boolean]> = [
    ['sales', 'customer_id', 'customers', true], ['sale_items', 'sale_id', 'sales', false], ['sale_items', 'item_id', 'items', true],
    ['sale_item_mazdoori_tasks', 'sale_item_id', 'sale_items', false], ['payments', 'customer_id', 'customers', true],
    ['payments', 'sale_id', 'sales', true], ['customer_ledger', 'customer_id', 'customers', false],
    ['customer_ledger', 'sale_id', 'sales', true], ['mazdoori_entries', 'mazdoor_id', 'mazdoors', false],
  ]
  for (const [table, key, target, optional] of references) for (const r of data.tables[table]) {
    if (optional && !r[key]) continue
    if (!data.tables[target].some(parent => parent.id === r[key])) throw new Error(`Missing linked record in ${table}.`)
  }
  const invoices = data.tables.sales.map(r => r.invoice_number)
  if (new Set(invoices).size !== invoices.length) throw new Error('Duplicate invoice numbers.')
  const numbers: Partial<Record<TableName, string[]>> = { customers: ['total_purchase', 'total_paid', 'balance'], mazdoors: ['total_work', 'total_paid', 'balance'], sales: ['subtotal', 'total_mazdoori', 'discount', 'total', 'paid_amount', 'remaining_credit'], sale_items: ['quantity', 'rate', 'mazdoori', 'amount'], sale_item_mazdoori_tasks: ['amount'], payments: ['amount'], customer_ledger: ['debit', 'credit', 'balance'], mazdoori_entries: ['amount', 'paid_amount', 'balance'], expenses: ['amount'] }
  for (const [table, keys] of Object.entries(numbers)) for (const r of data.tables[table as TableName]) for (const key of keys) if (typeof r[key] !== 'number' || !Number.isFinite(r[key])) throw new Error(`Invalid ${key} in ${table}.`)
  for (const table of ['customers', 'mazdoors'] as const) for (const record of data.tables[table]) {
    if (typeof record.name !== 'string' || !record.name.trim() || Math.abs(Number(record.balance) - (Number(record[table === 'customers' ? 'total_purchase' : 'total_work']) - Number(record.total_paid))) > 0.02) throw new Error(`Invalid ${table} profile or balance.`)
  }
  if (!['A4', '80mm', '58mm'].includes(String(settings.receipt_paper_size))) throw new Error('Unsupported receipt size.')
  for (const sale of data.tables.sales) {
    const lines = data.tables.sale_items.filter(i => i.sale_id === sale.id)
    const total = lines.reduce((sum, i) => sum + Number(i.amount), 0) - Number(sale.discount)
    if (!sale.invoice_number || !lines.length || Number(sale.discount) < 0 || Number(sale.total) <= 0 || Number(sale.paid_amount) < 0 || Math.abs(total - Number(sale.total)) > 0.02 || Number(sale.paid_amount) > Number(sale.total) || Math.abs(Number(sale.total) - Number(sale.paid_amount) - Number(sale.remaining_credit)) > 0.02 || !['cash', 'bank'].includes(String(sale.payment_method))) throw new Error(`Invoice ${sale.invoice_number} does not balance.`)
    if (Math.abs(lines.reduce((sum, item) => sum + Number(item.mazdoori), 0) - Number(sale.total_mazdoori)) > 0.02 || Math.abs(lines.reduce((sum, item) => sum + Number(item.amount) - Number(item.mazdoori), 0) - Number(sale.subtotal)) > 0.02) throw new Error('Invoice subtotal or labour does not balance.')
  }
  for (const item of data.tables.sale_items) if (!item.item_name || Number(item.quantity) <= 0 || Number(item.rate) < 0 || Number(item.mazdoori) < 0 || Math.abs(Number(item.quantity) * Number(item.rate) + Number(item.mazdoori) - Number(item.amount)) > 0.02) throw new Error('Invalid invoice item.')
  for (const payment of data.tables.payments) if (Number(payment.amount) <= 0 || !payment.payment_date || !['cash', 'bank'].includes(String(payment.payment_method))) throw new Error('Invalid receipt.')
  for (const task of data.tables.sale_item_mazdoori_tasks) if (!task.title || Number(task.amount) <= 0) throw new Error('Invalid labour task.')
  for (const expense of data.tables.expenses) if (!expense.category || !isValidDateKey(String(expense.expense_date)) || Number(expense.amount) <= 0 || !['cash', 'bank'].includes(String(expense.payment_method))) throw new Error('Invalid expense.')
  for (const item of data.tables.sale_items) {
    const tasks = data.tables.sale_item_mazdoori_tasks.filter(task => task.sale_item_id === item.id)
    if (tasks.length && Math.abs(tasks.reduce((sum, task) => sum + Number(task.amount), 0) - Number(item.mazdoori)) > 0.02) throw new Error('Labour tasks do not balance.')
  }
  return data
}
export function toRow(value: object): Row {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && !Array.isArray(v)).map(([key, value]) => [key.replace(/[A-Z]/g, c => '_' + c.toLowerCase()), value]))
}
export function fromRow<T>(r: Row): T {
  return Object.fromEntries(Object.entries(r).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), value])) as T
}

