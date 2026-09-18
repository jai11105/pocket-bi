'use client'

import { useState, useEffect } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BreakdownPoint } from '@/lib/analytics'
import { formatCurrency } from '@/lib/analytics'
import type { TransactionType } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

const BREAKDOWN_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'sale', label: 'Sales' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'expense', label: 'Expenses' },
]

function BreakdownTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-semibold text-popover-foreground">{p.name}</p>
      <p className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Sales</span>
        <span className="font-medium text-card-foreground">{formatCurrency(p.sales, true)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Product Profit</span>
        <span className="font-medium text-positive">{formatCurrency(p.profit, true)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Profit %</span>
        <span className="font-medium text-card-foreground">{(p.margin_pct ?? 0).toFixed(1)}%</span>
      </p>
    </div>
  )
}

export function BreakdownChart({
  byCategory,
  byChannel,
  breakdownType,
  onBreakdownTypeChange,
}: {
  byCategory: BreakdownPoint[]
  byChannel: BreakdownPoint[]
  breakdownType: TransactionType
  onBreakdownTypeChange: (type: TransactionType) => void
}) {
  const [view, setView] = useState<'category' | 'channel'>('category')

  useEffect(() => {
    setView('category')
  }, [breakdownType])

  const data = view === 'category' ? byCategory : byChannel
  const total = data.reduce((s, d) => s + d.sales, 0)
  const typeLabel = BREAKDOWN_TYPES.find((t) => t.value === breakdownType)?.label ?? 'Breakdown'
  const showChannelView = breakdownType === 'sale' || breakdownType === 'purchase'

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-card-foreground">{typeLabel} breakdown</h3>
        <div className="inline-flex rounded-full border border-border/60 p-0.5 text-[11px] font-semibold">
          {BREAKDOWN_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onBreakdownTypeChange(t.value)}
              className={cn(
                'rounded-full px-2.5 py-1 capitalize transition-colors',
                breakdownType === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {showChannelView && (
        <div className="mb-3 inline-flex rounded-full border border-border/60 p-0.5 text-[11px] font-semibold">
          {(['category', 'channel'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-full px-2.5 py-1 capitalize transition-colors',
                view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="sales"
                nameKey="name"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<BreakdownTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="text-base font-semibold text-card-foreground">
              {formatCurrency(total, true)}
            </span>
          </div>
        </div>

        <ul className="w-full space-y-1.5">
          {data.map((d, i) => {
            const share = total > 0 ? (d.sales / total) * 100 : 0
            return (
              <li key={d.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                <span className="font-medium text-card-foreground">{formatCurrency(d.sales, true)}</span>
                <span className="w-10 text-right text-muted-foreground">{share.toFixed(0)}%</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-4 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => (v.length > 8 ? v.slice(0, 7) + '…' : v)}
              interval={0}
              />
            <YAxis
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<BreakdownTooltip />} cursor={{ fill: 'var(--accent)', opacity: 0.4 }} />
            <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
