import type { Metrics, Timeframe, Transaction, TransactionInput } from './types'

export function roundMoney(n: number): number {
  const v = Number(n) || 0
  return Math.round(v * 100) / 100
}

function qty(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

export function calcTransactionTotals(input: TransactionInput): {
  amount: number
  cost_price: number
  quantity: number
} {
  const quantity = qty(input.quantity)
  const buyingPrice = Number(input.buying_price) || 0
  const sellingPrice = Number(input.selling_price) || 0
  switch (input.type) {
    case 'sale':
      return {
        amount: roundMoney(sellingPrice * quantity),
        cost_price: roundMoney(buyingPrice * quantity),
        quantity,
      }
    case 'purchase':
      return { amount: 0, cost_price: roundMoney(buyingPrice * quantity), quantity }
    case 'expense':
      return { amount: roundMoney(Number(input.amount) || 0), cost_price: 0, quantity: 1 }
    default:
      return { amount: 0, cost_price: 0, quantity }
  }
}

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
  const sales = txns.filter((t) => t.type === 'sale')
  const expenses = txns.filter((t) => t.type === 'expense')
  const totalSales = sales.reduce((s, t) => s + (t.amount || 0), 0)
  const totalBuyingCost = sales.reduce((s, t) => s + (t.cost_price || 0), 0)
  const productProfit = totalSales - totalBuyingCost
  const expensesTotal = expenses.reduce((s, t) => s + (t.amount || 0), 0)
  const volume = txns.length
  const saleCount = sales.length
  return {
    sales: roundMoney(totalSales),
    buyingCost: roundMoney(totalBuyingCost),
    productProfit: roundMoney(productProfit),
    profitPct: totalSales > 0 ? productProfit / totalSales : 0,
    expenses: roundMoney(expensesTotal),
    netProfit: roundMoney(productProfit - expensesTotal),
    volume,
    avgTransactionValue: roundMoney(saleCount > 0 ? totalSales / saleCount : 0),
  }
}

/** Percentage change of current period metrics vs the immediately preceding equal-length window. */
export function computeTrends(txns: Transaction[], tf: Timeframe, now = new Date()) {
  const start = startOfTimeframe(tf, now)
  if (!start) {
    // For "all" compare last half vs first half by date span.
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length < 2) return { sales: 0, profit: 0, margin: 0, volume: 0 }
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
    sales: pct(curr.sales, prev.sales),
    profit: pct(curr.productProfit, prev.productProfit),
    margin: (curr.profitPct - prev.profitPct) * 100,
    volume: pct(curr.volume, prev.volume),
  }
}

export type SeriesPoint = { date: string; sales: number; buyingCost: number; profit: number }

export function buildTimeSeries(txns: Transaction[]): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>()
  for (const t of txns) {
    if (t.type !== 'sale') continue
    const key = t.date
    const existing = map.get(key) ?? { date: key, sales: 0, buyingCost: 0, profit: 0 }
    existing.sales += t.amount || 0
    existing.buyingCost += t.cost_price || 0
    existing.profit = existing.sales - existing.buyingCost
    map.set(key, existing)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export type BreakdownPoint = { name: string; sales: number; profit: number; margin_pct: number }

export function buildBreakdown(txns: Transaction[], key: 'category' | 'channel'): BreakdownPoint[] {
  const map = new Map<string, BreakdownPoint>()
  for (const t of txns) {
    if (t.type !== 'sale') continue
    const name = t[key] as string
    const existing = map.get(name) ?? { name, sales: 0, profit: 0, margin_pct: 0 }
    existing.sales += t.amount || 0
    existing.profit += (t.amount || 0) - (t.cost_price || 0)
    map.set(name, existing)
  }
  return [...map.values()]
    .map((d) => ({
      ...d,
      sales: roundMoney(d.sales),
      profit: roundMoney(d.profit),
      margin_pct: d.sales > 0 ? Number(((d.profit / d.sales) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.sales - a.sales)
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
