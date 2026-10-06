import { getBusinessSettings } from '@/services/sqlite.service'
import { printDocument } from '@/utils/printing'
import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  FileCheck,
  FileText,
  HardHat,
  Landmark,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { PAYMENT_METHODS } from '@/constants/business'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/stores/cart.store'
import { useCustomers } from '@/hooks/useCustomers'
import { createSale } from '@/services/sqlite.service'
import { prepareBill } from '@/utils/billing'
import { formatPKR } from '@/utils/financial'
import { cn } from '@/utils/cn'
import { AddCustomerModal } from '@/features/customers/components/AddCustomerModal'
import { BillPreviewModal } from '../components/BillPreviewModal'
import type { ShopInvoiceData } from '../components/ShopInvoiceTemplate'
import type { Customer } from '@/types'

const COMMON_MAZDOORI_SUGGESTIONS = [
  'Chadar Bending',
  'Laser Cutting',
  'Dabi Press',
  'Welding',
  'Chogat Fitting',
  'Hole / Punching',
]

export function NewBillPage() {
  const {
    customer,
    setCustomer,
    items,
    discount,
    setDiscount,
    paidAmount,
    paymentMethod,
    notes,
    addItem,
    updateItem,
    removeItem,
    addItemMazdooriTask,
    removeItemMazdooriTask,
    setPaidAmount,
    setPaymentMethod,
    setNotes,
    resetCart,
    getGoodsSubtotal,
    getTotalMazdoori,
    getTotal,
    getCredit,
  } = useCartStore()

  const { customers, addCustomer } = useCustomers()

  // Customer dropdown search state
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [activeMazdooriItemId, setActiveMazdooriItemId] = useState<string | null>(null)
  const [previewInvoiceData, setPreviewInvoiceData] = useState<ShopInvoiceData | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Saving state & feedback
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Mazdoori task form inside active item modal
  const [newMazdooriTitle, setNewMazdooriTitle] = useState('')
  const [newMazdooriAmount, setNewMazdooriAmount] = useState('')
  const [newMazdooriWorker, setNewMazdooriWorker] = useState('')

  // Close customer dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeItem = items.find((it) => it.id === activeMazdooriItemId)
  const goodsSubtotal = getGoodsSubtotal()
  const totalMazdoori = getTotalMazdoori()
  const total = getTotal()
  const credit = getCredit()
  const totalItemsCount = items.length

  // Filter customers for dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch)
  )

  const handleSelectCustomer = (selected: Customer) => {
    setCustomer(selected)
    setCustomerSearch('')
    setIsCustomerDropdownOpen(false)
  }

  const handleClearCustomer = () => {
    setCustomer(null)
    setCustomerSearch('')
  }

  // Handle adding custom mazdoori task
  const handleAddMazdooriTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeItem || !newMazdooriTitle.trim()) return

    const parsedAmount = Math.max(0, parseFloat(newMazdooriAmount) || 0)
    addItemMazdooriTask(activeItem.id, {
      title: newMazdooriTitle.trim(),
      amount: parsedAmount,
      workerName: newMazdooriWorker.trim() || undefined,
    })

    setNewMazdooriTitle('')
    setNewMazdooriAmount('')
    setNewMazdooriWorker('')
  }

  // Perform Save Bill Transaction
  const handleSaveBill = async (andThen?: 'preview' | 'whatsapp' | 'print'): Promise<string | null> => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (isSaving) return null
    setIsSaving(true)
    try {
      const bill = prepareBill(items, discount, paidAmount)
      const validItems = bill.items
      const invoiceNumber = await createSale({
        ...bill,
        customerId: customer?.id || null,
        customerName: customer?.name || null,
        customerMobile: customer?.mobile || null,
        paymentMethod,
        notes: notes.trim() || undefined,
      })

      const invoiceData: ShopInvoiceData = {
        invoiceNumber,
        date: new Date().toISOString(),
        customer: customer || null,
        customerName: customer?.name || '',
        customerPhone: customer?.mobile || '',
        customerAddress: customer?.address || '',
        items: validItems,
        subtotal: bill.subtotal,
        totalMazdoori: bill.totalMazdoori,
        discount: bill.discount,
        total: bill.total,
        paidAmount: bill.paidAmount,
        remainingCredit: bill.remainingCredit,
        paymentMethod: paymentMethod,
      }

      setPreviewInvoiceData(invoiceData)
      setIsPreviewOpen(true)
      resetCart()
      setSuccessMessage(`Invoice #${invoiceNumber} saved successfully!`)

      if (andThen === 'print') {
        setTimeout(() => { getBusinessSettings().then(settings => printDocument('shop-invoice-canvas', settings.receiptPaperSize)).catch(err => setErrorMessage(String(err))) }, 300)
      }

      return invoiceNumber
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  // Keyboard flow: Enter moves to the next cell, the last cell of the last row adds a new line
  const pendingFocusRow = useRef<number | null>(null)
  const focusCell = (row: number, col: number) => {
    const input = document.querySelector<HTMLInputElement>(`[data-bill-cell="${row}-${col}"]`)
    input?.focus(); input?.select()
  }
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (col < 3) focusCell(row, col + 1)
    else if (row < items.length - 1) focusCell(row + 1, 0)
    else { pendingFocusRow.current = row + 1; addItem() }
  }
  useEffect(() => {
    if (pendingFocusRow.current === null) return
    focusCell(pendingFocusRow.current, 0)
    pendingFocusRow.current = null
  }, [items.length])

  // Ctrl+S saves the bill (ignored while a popup is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!isPreviewOpen && !activeMazdooriItemId && !isAddCustomerOpen) void handleSaveBill()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const handleStartNewBill = () => {
    resetCart()
    setIsPreviewOpen(false)
    setPreviewInvoiceData(null)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  return (
    <div className="grid grid-cols-12 gap-5 items-stretch min-h-full">
      {/* Left Column: Bill Entry Form (8 cols) */}
      <div className="col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between shadow-2xs">
        <div className="space-y-4">
          {/* Header Title & Subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-slate-900 leading-tight">New Bill</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Generate free-form invoices with itemized labor & instant PNG export
              </p>
            </div>
            {customer && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-900">{customer.name}</span>
                <span className="text-xs text-blue-600">({customer.mobile})</span>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-blue-400 hover:text-blue-700 ml-1"
                  title="Clear customer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
              {successMessage}
            </div>
          )}

          {/* Customer Selection Row */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">
              Customer <span className="font-normal text-slate-500">(Optional - Walk-in cash or account client)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative" ref={dropdownRef}>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <input
                    type="text"
                    value={customer ? `${customer.name} - ${customer.mobile}` : customerSearch}
                    onChange={(e) => {
                      if (customer) setCustomer(null)
                      setCustomerSearch(e.target.value)
                      setIsCustomerDropdownOpen(true)
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="Search customer by name or mobile number..."
                    className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute right-3 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4 stroke-[2.2]" />
                  </div>
                </div>

                {/* Dropdown Options */}
                {isCustomerDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No customer found matching "{customerSearch}"
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectCustomer(cust)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{cust.name}</p>
                            <p className="text-slate-500">{cust.mobile}</p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-semibold ${
                                cust.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                              }`}
                            >
                              Balance: {formatPKR(cust.balance)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="h-10 px-4 bg-[#1877F2] hover:bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Customer</span>
              </button>
            </div>
          </div>

          {/* Items Table with Mazdoori Column */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">
                    Item / Description <span className="font-normal text-slate-500 text-[11px]">(Product or service)</span>
                  </th>
                  <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-24 text-center">Rate (Rs)</th>
                  <th className="py-2.5 px-2 w-36 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <HardHat className="w-3.5 h-3.5 text-purple-600 stroke-[2.2]" />
                      <span>Mazdoori (Rs)</span>
                    </span>
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">Amount (Rs)</th>
                  <th className="py-2.5 px-2 w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const tasksCount = item.mazdooriTasks?.length || 0

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-xs font-medium text-slate-600">
                        {index + 1}
                      </td>

                      {/* Item Name */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.itemName}
                          data-bill-cell={`${index}-0`}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 0)}
                          onChange={(e) => updateItem(item.id, { itemName: e.target.value })}
                          placeholder="e.g. Chadar 8x4 / Laser Cut Grill"
                          className="w-full h-8 px-3 text-sm text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          data-bill-cell={`${index}-1`}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 1)}
                          onChange={(e) =>
                            updateItem(item.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                          className="w-full h-8 text-center text-sm text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.rate || ''}
                          placeholder="0"
                          data-bill-cell={`${index}-2`}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 2)}
                          onChange={(e) =>
                            updateItem(item.id, { rate: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full h-8 text-center text-sm text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Mazdoori Field */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={item.mazdoori || ''}
                            placeholder="0"
                            data-bill-cell={`${index}-3`}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 3)}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0)
                              updateItem(item.id, { mazdoori: val })
                            }}
                            className={cn(
                              'w-full h-8 text-center text-sm font-semibold border rounded-lg bg-white focus:outline-none focus:ring-1 transition-colors',
                              item.mazdoori > 0
                                ? 'text-purple-700 border-purple-300 bg-purple-50/30 focus:border-purple-500 focus:ring-purple-500'
                                : 'text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-blue-500'
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setActiveMazdooriItemId(item.id)}
                            className={cn(
                              'h-8 px-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer',
                              tasksCount > 0
                                ? 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                            )}
                            title="Add multiple partner / labor worker tasks"
                          >
                            <HardHat className="w-3.5 h-3.5 stroke-[2.2]" />
                            <span>{tasksCount > 0 ? tasksCount : '+'}</span>
                          </button>
                        </div>
                        {tasksCount > 0 && (
                          <div className="text-[10px] text-purple-600 truncate mt-0.5 text-left px-1">
                            {item.mazdooriTasks?.map((t) => t.title).filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Row Total Amount */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 text-sm">
                        {item.amount.toLocaleString()}
                      </td>

                      {/* Delete Item */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Add Another Item Button */}
          <button
            type="button"
            onClick={() => addItem()}
            className="w-full py-2.5 bg-[#EAF2FD] hover:bg-blue-100 text-[#1877F2] font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Another Item</span>
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            Shortcuts: <b>Enter</b> next field / new line · <b>Ctrl+S</b> save bill · <b>F2</b> new bill
          </p>
        </div>

        {/* Notes (Optional) */}
        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
            <FileText className="w-4 h-4 text-slate-600 shrink-0 stroke-[2]" />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (Optional) - e.g. delivery date, balance details, metal gauge, etc."
              className="w-full text-xs text-slate-700 bg-transparent placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Right Column: Bill Summary (4 cols) */}
      <div className="col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between shadow-2xs">
        <div className="space-y-4">
          <h2 className="text-[20px] font-bold text-slate-900">Bill Summary</h2>

          {/* Line Items */}
          <div className="space-y-3 pt-1 text-[14px]">
            <div className="flex justify-between items-center text-slate-700">
              <span>Total Items</span>
              <span className="font-bold text-slate-900 text-base">{totalItemsCount}</span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span>Goods Subtotal</span>
              <span className="font-semibold text-slate-900 text-[15px]">
                Rs {goodsSubtotal.toLocaleString()}
              </span>
            </div>

            {totalMazdoori > 0 && (
              <div className="flex justify-between items-center text-purple-700 bg-purple-50/70 px-2.5 py-1.5 rounded-lg border border-purple-100">
                <span className="flex items-center gap-1.5 font-medium text-xs">
                  <HardHat className="w-3.5 h-3.5 stroke-[2]" />
                  Total Mazdoori (Labor)
                </span>
                <span className="font-bold text-purple-700 text-sm">
                  + Rs {totalMazdoori.toLocaleString()}
                </span>
              </div>
            )}

            {/* Discount field */}
            <div className="flex justify-between items-center text-slate-700">
              <span>Discount</span>
              <div className="w-28">
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full h-8 px-2.5 text-right font-medium text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-900 pt-1 border-t border-slate-100">
              <span className="font-bold">Total Amount</span>
              <span className="font-bold text-slate-900 text-[18px]">
                Rs {total.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <div className="flex items-center gap-2">
                <span>Paid Amount</span>
                <button
                  type="button"
                  onClick={() => setPaidAmount(total)}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  (Full)
                </button>
              </div>
              <div className="w-28">
                <input
                  type="number"
                  min="0"
                  value={paidAmount || ''}
                  placeholder="0"
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-full h-8 px-2.5 text-right font-bold text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-bold text-red-600 text-[15px]">Remaining (Credit)</span>
              <span className="font-bold text-red-600 text-[18px]">
                Rs {credit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Type Section */}
          <div className="pt-2">
            <h3 className="text-[13px] font-bold text-slate-800 mb-2">Payment Type</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod(PAYMENT_METHODS.CASH)}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                  paymentMethod === PAYMENT_METHODS.CASH
                    ? 'bg-[#E8F8F0] border-emerald-400 text-[#065F46] shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-5 h-5 rounded-sm bg-emerald-700 text-white flex items-center justify-center">
                  <span className="text-[10px] font-extrabold leading-none">&#9670;</span>
                </div>
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod(PAYMENT_METHODS.BANK)}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                  paymentMethod === PAYMENT_METHODS.BANK
                    ? 'bg-[#EAF2FD] border-blue-400 text-blue-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-4 h-4 stroke-[2.2] text-slate-700" />
                <span>Bank</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mt-auto pt-5">
          {/* Save Bill Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveBill()}
            className="w-full py-3.5 bg-[#0F8A4B] hover:bg-[#0c743e] disabled:opacity-50 text-white font-bold text-[16px] rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileCheck className="w-5 h-5 stroke-[2.2]" />
            )}
            <span>{isSaving ? 'Saving Invoice...' : 'Save Bill'}</span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* WhatsApp */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveBill('whatsapp')}
              className="py-2.5 px-3 bg-[#EAF9F1] hover:bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-center gap-2 text-[#047857] text-xs font-bold transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600 stroke-white stroke-[2]" />
              <div className="text-left leading-tight">
                <div>Share as PNG</div>
                <div>WhatsApp</div>
              </div>
            </button>

            {/* Print Bill */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveBill('print')}
              className="py-2.5 px-3 bg-[#F1F5F9] hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.2]" />
              <span>Print Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multiple Mazdoori Tasks Modal for Active Row */}
      {activeItem && (
        <Modal
          isOpen={!!activeMazdooriItemId}
          onClose={() => setActiveMazdooriItemId(null)}
          title={
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <HardHat className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Mazdoori Breakdown</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Add multiple partner / labor worker tasks for "{activeItem.itemName || 'this item'}"
                </p>
              </div>
            </div>
          }
          size="md"
        >
          <div className="space-y-4">
            {/* Existing Tasks List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Current Labor Tasks ({activeItem.mazdooriTasks?.length || 0})
              </p>
              {(!activeItem.mazdooriTasks || activeItem.mazdooriTasks.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No breakdown tasks yet. Use the form below or pick a suggestion.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeItem.mazdooriTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 bg-purple-50/50 border border-purple-100 rounded-xl text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{t.title}</span>
                        {(t.workerName || t.mazdoorName) && (
                          <span className="text-purple-700 ml-1.5 font-medium">
                            ({t.workerName || t.mazdoorName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-purple-800">Rs {t.amount.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => removeItemMazdooriTask(activeItem.id, t.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Suggestions */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Quick Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_MAZDOORI_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNewMazdooriTitle(sug)}
                    className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg text-slate-700 font-medium transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddMazdooriTask} className="space-y-3 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Task title (e.g. Chadar Bending)"
                  value={newMazdooriTitle}
                  onChange={(e) => setNewMazdooriTitle(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount (Rs)"
                  min="1"
                  value={newMazdooriAmount}
                  onChange={(e) => setNewMazdooriAmount(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <input
                type="text"
                placeholder="Worker / Partner Name (Optional, e.g. Aslam)"
                value={newMazdooriWorker}
                onChange={(e) => setNewMazdooriWorker(e.target.value)}
                className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-500"
              />

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveMazdooriItemId(null)}
                >
                  Done
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Add Task
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Add New Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onAdd={async (formData) => {
          const newCust = await addCustomer(formData)
          setCustomer(newCust)
          return newCust
        }}
      />

      {/* Invoice Preview, Print, and PNG Sharing Modal */}
      <BillPreviewModal
        isOpen={isPreviewOpen}
        data={previewInvoiceData}
        onClose={() => setIsPreviewOpen(false)}
        onNewBill={handleStartNewBill}
      />
    </div>
  )
}
