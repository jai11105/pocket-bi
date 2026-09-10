'use client'

import { Boxes, Percent, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import type { Metrics } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type Trends = { revenue: number; profit: number; margin: number; volume: number }

export function KpiCarousel({ metrics, trends }: { metrics: Metrics; trends: Trends }) {
  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue, true),
      trend: trends.revenue,
      icon: Wallet,
    },
    {
      label: 'Gross Profit',
      value: formatCurrency(metrics.grossProfit, true),
      trend: trends.profit,
      icon: TrendingUp,
    },
    {
      label: 'Profit Margin',
      value: `${(metrics.profitMargin * 100).toFixed(1)}%`,
      trend: trends.margin,
      icon: Percent,
      trendIsPoints: true,
    },
    {
      label: 'Transactions',
      value: metrics.volume.toLocaleString(),
      trend: trends.volume,
      icon: Boxes,
      sub: `Avg ${formatCurrency(metrics.avgTransactionValue)}`,
    },
  ]

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
      {cards.map((c) => {
        const positive = c.trend >= 0
        const TrendIcon = positive ? TrendingUp : TrendingDown
        return (
          <div
            key={c.label}
            className="min-w-[60%] flex-1 snap-start rounded-2xl border border-border/60 bg-card p-4 sm:min-w-0"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                <c.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  positive
                    ? 'bg-positive/12 text-positive'
                    : 'bg-negative/12 text-negative',
                )}
              >
                <TrendIcon className="h-3 w-3" aria-hidden="true" />
                {c.trendIsPoints ? `${formatPct(c.trend)}pt` : formatPct(c.trend)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-0.5 text-2xl font-semibold tracking-tight text-card-foreground">
              {c.value}
            </p>
            {c.sub ? <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p> : null}
          </div>
        )
      })}
    </div>
  )
}
