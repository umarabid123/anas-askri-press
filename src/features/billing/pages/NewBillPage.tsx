import { useState } from 'react'
import {
  ChevronDown,
  FileCheck,
  FileText,
  HardHat,
  Landmark,
  MessageCircle,
  Plus,
  Printer,
  Trash2,
  User,
} from 'lucide-react'
import { PAYMENT_METHODS } from '@/constants/business'
import { Modal } from '@/components/ui/Modal'
import { useCartStore } from '@/stores/cart.store'
import { cn } from '@/utils/cn'

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
    items,
    paidAmount,
    paymentMethod,
    notes,
    addItem,
    updateItem,
    removeItem,
    addItemMazdooriTask,
    removeItemMazdooriTask,
    updateItemMazdooriTask,
    setPaidAmount,
    setPaymentMethod,
    setNotes,
    getGoodsSubtotal,
    getTotalMazdoori,
    getTotal,
    getCredit,
  } = useCartStore()

  // Track which item row's Mazdoori modal is open (null if closed)
  const [activeMazdooriItemId, setActiveMazdooriItemId] = useState<string | null>(null)

  const activeItem = items.find((it) => it.id === activeMazdooriItemId)
  const goodsSubtotal = getGoodsSubtotal()
  const totalMazdoori = getTotalMazdoori()
  const total = getTotal()
  const credit = getCredit()
  const totalItemsCount = items.length

  return (
    <div className="grid grid-cols-12 gap-5 items-stretch min-h-full">
      {/* Left Column: Bill Entry Form (8 cols) */}
      <div className="col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between shadow-2xs">
        <div className="space-y-4">
          {/* Header Title & Subtitle */}
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">New Bill</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Jaldi Bill Banao, Aasaan Kaam</p>
          </div>

          {/* Customer Selection Row */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">
              Customer <span className="font-normal text-slate-500">(Optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative flex items-center">
                <div className="absolute left-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  placeholder="Enter name or mobile number"
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute right-3 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <button
                type="button"
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
                    Item / Detail <span className="font-normal text-slate-500 text-[11px]">(Jo bhi becha hai)</span>
                  </th>
                  <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-20 text-center">Rate (Rs)</th>
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
                          onChange={(e) => updateItem(item.id, { itemName: e.target.value })}
                          placeholder="Item name"
                          className="w-full h-8 px-3 text-sm text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
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
                          onChange={(e) =>
                            updateItem(item.id, { rate: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full h-8 text-center text-sm text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Mazdoori Field (allows direct typing + multiple things via popup) */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={item.mazdoori || ''}
                            placeholder="0"
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
                            title="Add multiple mazdoori tasks"
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
        </div>

        {/* Notes (Optional) at bottom of left panel */}
        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
            <FileText className="w-4 h-4 text-slate-600 shrink-0 stroke-[2]" />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (Optional) - e.g. delivery, advance, etc."
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
                  Total Mazdoori
                </span>
                <span className="font-bold text-purple-700 text-sm">
                  + Rs {totalMazdoori.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-900 pt-1 border-t border-slate-100">
              <span className="font-bold">Total Amount</span>
              <span className="font-bold text-slate-900 text-[18px]">
                Rs {total.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span>Paid Amount</span>
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
              {/* Cash Button */}
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

              {/* Bank Button */}
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

        {/* Action Buttons at bottom of right panel */}
        <div className="space-y-3 mt-auto pt-5">
          {/* Save Bill Button */}
          <button
            type="button"
            className="w-full py-3.5 bg-[#0F8A4B] hover:bg-[#0c743e] text-white font-bold text-[16px] rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <FileCheck className="w-5 h-5 stroke-[2.2]" />
            <span>Save Bill</span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* WhatsApp */}
            <button
              type="button"
              className="py-2.5 px-3 bg-[#EAF9F1] hover:bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-center gap-2 text-[#047857] text-xs font-bold transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600 stroke-white stroke-[2]" />
              <div className="text-left leading-tight">
                <div>Send on</div>
                <div>WhatsApp</div>
              </div>
            </button>

            {/* Print Bill */}
            <button
              type="button"
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
                <span>Mazdoori Details</span>
                <span className="text-slate-400 font-normal text-xs ml-2">
                  ({activeItem.itemName || 'Selected Item'})
                </span>
              </div>
            </div>
          }
          description="Is item ke liye multiple mazdoori kaam aur unka hisaab jorein"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-sm">
                <span className="text-slate-500 font-medium">Total Mazdoori: </span>
                <span className="text-base font-bold text-purple-700">
                  Rs {activeItem.mazdoori.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMazdooriItemId(null)}
                className="px-5 py-2 bg-[#1877F2] hover:bg-blue-600 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Quick Suggestions Chips */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">
                Quick Add Suggestions:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {COMMON_MAZDOORI_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      addItemMazdooriTask(activeItem.id, {
                        title: suggestion,
                        amount: 0,
                      })
                    }
                    className="text-xs font-medium px-2.5 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-2">
              {(!activeItem.mazdooriTasks || activeItem.mazdooriTasks.length === 0) ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <HardHat className="w-8 h-8 text-slate-300 mx-auto mb-1 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-700">Koi mazdoori add nahi hui</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upar diye gaye suggestions par click karein ya naya kaam add karein
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2 px-3 w-8 text-center">#</th>
                        <th className="py-2 px-3">Kaam / Task Detail</th>
                        <th className="py-2 px-3 w-36">Karigar / Worker</th>
                        <th className="py-2 px-3 w-28 text-center">Amount (Rs)</th>
                        <th className="py-2 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeItem.mazdooriTasks.map((task, idx) => (
                        <tr key={task.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) =>
                                updateItemMazdooriTask(activeItem.id, task.id, {
                                  title: e.target.value,
                                })
                              }
                              placeholder="e.g. Chadar Bending, Welding"
                              className="w-full h-8 px-2.5 text-xs text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={task.mazdoorName || ''}
                              onChange={(e) =>
                                updateItemMazdooriTask(activeItem.id, task.id, {
                                  mazdoorName: e.target.value,
                                })
                              }
                              placeholder="Worker name"
                              className="w-full h-8 px-2.5 text-xs text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={task.amount || ''}
                              placeholder="0"
                              onChange={(e) =>
                                updateItemMazdooriTask(activeItem.id, task.id, {
                                  amount: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full h-8 px-2.5 text-center text-xs font-bold text-purple-700 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemMazdooriTask(activeItem.id, task.id)}
                              className="text-red-500 hover:text-red-700 p-1 transition-colors cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2.2]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Custom Task Button */}
              <button
                type="button"
                onClick={() =>
                  addItemMazdooriTask(activeItem.id, {
                    title: '',
                    amount: 0,
                  })
                }
                className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Another Kaam / Task</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}


