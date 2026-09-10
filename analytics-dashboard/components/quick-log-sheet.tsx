'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { CATEGORIES, REGIONS, type Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

const today = () => new Date().toISOString().split('T')[0]

export function QuickLogSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (t: Omit<Transaction, 'record_id'>) => Promise<void>
}) {
  const [form, setForm] = useState({
    date: today(),
    category: CATEGORIES[0] as string,
    region: REGIONS[0] as string,
    units: '1',
    revenue: '',
    cost: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setForm({ date: today(), category: CATEGORIES[0], region: REGIONS[0], units: '1', revenue: '', cost: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        date: form.date,
        category: form.category,
        region: form.region,
        units: Number(form.units) || 1,
        revenue: Number(form.revenue) || 0,
        cost: Number(form.cost) || 0,
      })
      reset()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

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
            <Field label="Category">
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
            <Field label="Region">
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className={inputCls}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Units">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.units}
                onChange={(e) => setForm({ ...form, units: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Revenue">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Cost">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

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
