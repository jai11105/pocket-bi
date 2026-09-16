'use client'

import { useMemo } from 'react'
import { Database, RefreshCw } from 'lucide-react'
import {
  buildBreakdown,
  buildTimeSeries,
  computeMetrics,
  computeTrends,
  filterByTimeframe,
} from '@/lib/analytics'
import type { AiInsight, Timeframe, Transaction } from '@/lib/types'
import { BreakdownChart } from './breakdown-chart'
import { InsightCard } from './insight-card'
import { KpiCarousel } from './kpi-carousel'
import { TimeframeFilter } from './timeframe-filter'
import { TrendChart } from './trend-chart'

export function DashboardView({
  transactions,
  aiInsight,
  timeframe,
  onTimeframeChange,
  source,
  onRefresh,
  isLoading,
}: {
  transactions: Transaction[]
  aiInsight: AiInsight | null
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  source: string
  onRefresh: () => void
  isLoading: boolean
}) {
  const filtered = useMemo(() => filterByTimeframe(transactions, timeframe), [transactions, timeframe])
  const metrics = useMemo(() => computeMetrics(filtered), [filtered])
  const trends = useMemo(() => computeTrends(transactions, timeframe), [transactions, timeframe])
  const series = useMemo(() => buildTimeSeries(filtered), [filtered])
  const byCategory = useMemo(() => buildBreakdown(filtered, 'category'), [filtered])
  const byChannel = useMemo(() => buildBreakdown(filtered, 'channel'), [filtered])

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">PocketBI</h1>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="h-3 w-3" aria-hidden="true" />
            {source === 'supabase' ? 'Live: Supabase' : 'Demo data'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh data"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </header>

      <TimeframeFilter value={timeframe} onChange={onTimeframeChange} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          No transactions in this timeframe. Try a wider range or log a new one.
        </div>
      ) : (
        <>
          <KpiCarousel metrics={metrics} trends={trends} />
          <InsightCard insight={aiInsight} />
          <TrendChart data={series} />
          <BreakdownChart byCategory={byCategory} byChannel={byChannel} />
        </>
      )}
    </div>
  )
}
