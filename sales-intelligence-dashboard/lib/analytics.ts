import type { Metrics, Timeframe, Transaction } from './types'

export function startOfTimeframe(tf: Timeframe, now = new Date()): Date | null {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  switch (tf) {
    case 'today':
      return d
    case '7d':
      d.setDate(d.getDate() - 6)
      return d
    case '30d':
      d.setDate(d.getDate() - 29)
      return d
    case 'all':
    default:
      return null
  }
}

export function filterByTimeframe(txns: Transaction[], tf: Timeframe, now = new Date()): Transaction[] {
  const start = startOfTimeframe(tf, now)
  if (!start) return txns
  const startTime = start.getTime()
  return txns.filter((t) => new Date(t.date).getTime() >= startTime)
}

export function computeMetrics(txns: Transaction[]): Metrics {
  const totalRevenue = txns.reduce((s, t) => s + (t.revenue || 0), 0)
  const totalCost = txns.reduce((s, t) => s + (t.cost || 0), 0)
  const grossProfit = totalRevenue - totalCost
  const volume = txns.length
  return {
    totalRevenue,
    totalCost,
    grossProfit,
    profitMargin: totalRevenue > 0 ? grossProfit / totalRevenue : 0,
    volume,
    avgTransactionValue: volume > 0 ? totalRevenue / volume : 0,
  }
}

/** Percentage change of current period metrics vs the immediately preceding equal-length window. */
export function computeTrends(txns: Transaction[], tf: Timeframe, now = new Date()) {
  const start = startOfTimeframe(tf, now)
  if (!start) {
    // For "all" compare last half vs first half by date span.
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length < 2) return { revenue: 0, profit: 0, margin: 0, volume: 0 }
    const mid = Math.floor(sorted.length / 2)
    return diffMetrics(computeMetrics(sorted.slice(mid)), computeMetrics(sorted.slice(0, mid)))
  }
  const startTime = start.getTime()
  const windowMs = now.getTime() - startTime
  const prevStart = startTime - windowMs
  const current = txns.filter((t) => new Date(t.date).getTime() >= startTime)
  const previous = txns.filter((t) => {
    const time = new Date(t.date).getTime()
    return time >= prevStart && time < startTime
  })
  return diffMetrics(computeMetrics(current), computeMetrics(previous))
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100
  return ((curr - prev) / Math.abs(prev)) * 100
}

function diffMetrics(curr: Metrics, prev: Metrics) {
  return {
    revenue: pct(curr.totalRevenue, prev.totalRevenue),
    profit: pct(curr.grossProfit, prev.grossProfit),
    margin: (curr.profitMargin - prev.profitMargin) * 100,
    volume: pct(curr.volume, prev.volume),
  }
}

export type SeriesPoint = { date: string; revenue: number; cost: number; profit: number }

export function buildTimeSeries(txns: Transaction[]): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>()
  for (const t of txns) {
    const key = t.date
    const existing = map.get(key) ?? { date: key, revenue: 0, cost: 0, profit: 0 }
    existing.revenue += t.revenue || 0
    existing.cost += t.cost || 0
    existing.profit = existing.revenue - existing.cost
    map.set(key, existing)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export type BreakdownPoint = { name: string; revenue: number; profit: number }

export function buildBreakdown(txns: Transaction[], key: 'category' | 'region'): BreakdownPoint[] {
  const map = new Map<string, BreakdownPoint>()
  for (const t of txns) {
    const name = t[key]
    const existing = map.get(name) ?? { name, revenue: 0, profit: 0 }
    existing.revenue += t.revenue || 0
    existing.profit += (t.revenue || 0) - (t.cost || 0)
    map.set(name, existing)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

export function formatCurrency(n: number, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n || 0)
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}
