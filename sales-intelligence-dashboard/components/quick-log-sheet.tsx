'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransactionInput, TransactionType } from '@/lib/types'
import { formatCurrency } from '@/lib/analytics'

const CATEGORIES = ['Grocery', 'Vegetables', 'Tea/Tiffin', 'Petrol', 'Rent'] as const
const CHANNELS = ['Counter', 'Online', 'WhatsApp', 'Mandi'] as const
const TYPES = ['sale', 'purchase', 'expense'] as const

const today = () => new Date().toISOString().split('T')[0]

export function QuickLogSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (t: TransactionInput) => Promise<void>
}) {
  const [form, setForm] = useState<{
    date: string
    category: string
    type: TransactionType
    item_name: string
    channel: string
    quantity: string
    buying_price: string
    selling_price: string
    expense_amount: string
    notes: string
  }>({
    date: today(),
    category: CATEGORIES[0],
    type: TYPES[0],
    item_name: '',
    channel: CHANNELS[0],
    quantity: '1',
    buying_price: '',
    selling_price: '',
    expense_amount: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setForm({
      date: today(),
      category: CATEGORIES[0],
      type: TYPES[0],
      item_name: '',
      channel: CHANNELS[0],
      quantity: '1',
      buying_price: '',
      selling_price: '',
      expense_amount: '',
      notes: '',
    })
  }

  const qty = Number(form.quantity) || 0
  const buying = Number(form.buying_price) || 0
  const selling = Number(form.selling_price) || 0
  const expense = Number(form.expense_amount) || 0

  const totalSales = selling * qty
  const totalCost = buying * qty
  const productProfit = totalSales - totalCost
  const profitPct = totalSales > 0 ? (productProfit / totalSales) * 100 : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      let input: TransactionInput
      if (form.type === 'sale') {
        input = {
          type: 'sale',
          date: form.date,
          category: form.category,
          item_name: form.item_name,
          channel: form.channel,
          quantity: Number(form.quantity) || 1,
          buying_price: buying,
          selling_price: selling,
          notes: form.notes,
        }
      } else if (form.type === 'purchase') {
        input = {
          type: 'purchase',
          date: form.date,
          category: form.category,
          item_name: form.item_name,
          channel: form.channel,
          quantity: Number(form.quantity) || 1,
          buying_price: buying,
          notes: form.notes,
        }
      } else {
        input = {
          type: 'expense',
          date: form.date,
          category: form.category,
          item_name: form.item_name,
          channel: form.channel,
          quantity: 1,
          amount: expense,
          notes: form.notes,
        }
      }
      await onSubmit(input)
      reset()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const isSale = form.type === 'sale'
  const isPurchase = form.type === 'purchase'
  const isExpense = form.type === 'expense'

  const categoryLabel = isExpense ? 'Expense Category' : 'Category'
  const itemLabel = isExpense ? 'Description' : 'Product'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Log transaction">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl border border-border/60 bg-card p-5 pb-8 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">Log transaction</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Date">
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={categoryLabel}>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Transaction Type">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })}
                className={inputCls}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={itemLabel}>
            <input
              type="text"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              className={inputCls}
            />
          </Field>

          {isSale && (
            <Field label="Channel">
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className={inputCls}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {(isSale || isPurchase) && (
            <Field label="Quantity">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className={inputCls}
              />
            </Field>
          )}

          {(isSale || isPurchase) && (
            <Field label="Buying Price / unit">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={form.buying_price}
                onChange={(e) => setForm({ ...form, buying_price: e.target.value })}
                className={inputCls}
              />
            </Field>
          )}

          {isSale && (
            <Field label="Selling Price / unit">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                className={inputCls}
              />
            </Field>
          )}

          {isExpense && (
            <Field label="Expense Amount">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={form.expense_amount}
                onChange={(e) => setForm({ ...form, expense_amount: e.target.value })}
                className={inputCls}
              />
            </Field>
          )}

          {isSale && form.selling_price && form.buying_price && form.quantity && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Sales</span>
                <span className="font-medium">{formatCurrency(totalSales)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Buying Cost</span>
                <span className="font-medium">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product Profit</span>
                <span className="font-medium">{formatCurrency(productProfit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit %</span>
                <span className="font-medium">{profitPct.toFixed(2)}%</span>
              </div>
            </div>
          )}

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputCls}
              rows={3}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity',
              submitting && 'opacity-70',
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {submitting ? 'Saving…' : 'Save transaction'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
