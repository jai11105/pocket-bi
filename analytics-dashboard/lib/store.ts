import { CATEGORIES, REGIONS, type AiInsight, type Transaction } from './types'

/**
 * In-memory demo backend that mirrors the shape of the Google Apps Script
 * REST API described in the spec. When GOOGLE_APPS_SCRIPT_URL is configured
 * the API routes proxy to the real Google Sheet instead of using this store.
 */

const g = globalThis as unknown as {
  __BI_TXNS__?: Transaction[]
  __BI_AI__?: AiInsight | null
}

function seedTransactions(): Transaction[] {
  // Deterministic-ish seed so the demo looks consistent across reloads.
  const txns: Transaction[] = []
  const now = new Date()
  const days = 60
  let seq = 100000

  // Category economics: [base revenue, margin]
  const catProfile: Record<string, { base: number; margin: number; weight: number }> = {
    'Enterprise SaaS': { base: 4200, margin: 0.62, weight: 0.28 },
    'SMB Subscriptions': { base: 780, margin: 0.55, weight: 0.3 },
    'Professional Services': { base: 2600, margin: 0.34, weight: 0.18 },
    Marketplace: { base: 1400, margin: 0.22, weight: 0.14 },
    Hardware: { base: 3100, margin: 0.16, weight: 0.1 },
  }
  const regionWeight: Record<string, number> = {
    'North America': 0.42,
    EMEA: 0.28,
    APAC: 0.2,
    LATAM: 0.1,
  }

  const rand = mulberry32(20260903)

  for (let d = days; d >= 0; d--) {
    const date = new Date(now)
    date.setDate(now.getDate() - d)
    const iso = date.toISOString().split('T')[0]
    // Gentle upward trend + weekend dip.
    const dayOfWeek = date.getDay()
    const weekend = dayOfWeek === 0 || dayOfWeek === 6 ? 0.55 : 1
    const trend = 0.7 + ((days - d) / days) * 0.6
    const count = Math.max(1, Math.round((2 + rand() * 4) * weekend * trend))

    for (let i = 0; i < count; i++) {
      const category = weightedPick(CATEGORIES as unknown as string[], (c) => catProfile[c].weight, rand)
      const region = weightedPick(REGIONS as unknown as string[], (r) => regionWeight[r], rand)
      const profile = catProfile[category]
      const noise = 0.6 + rand() * 0.9
      const revenue = Math.round(profile.base * noise * trend)
      const marginNoise = profile.margin + (rand() - 0.5) * 0.12
      const cost = Math.max(0, Math.round(revenue * (1 - marginNoise)))
      const units = Math.max(1, Math.round((revenue / 300) * (0.5 + rand())))
      txns.push({
        record_id: `TXN_${seq++}`,
        date: iso,
        category,
        region,
        units,
        revenue,
        cost,
      })
    }
  }
  return txns
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rand: () => number): T {
  const total = items.reduce((s, it) => s + weight(it), 0)
  let r = rand() * total
  for (const it of items) {
    r -= weight(it)
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

export function getTransactions(): Transaction[] {
  if (!g.__BI_TXNS__) {
    g.__BI_TXNS__ = seedTransactions()
    g.__BI_AI__ = {
      timestamp: new Date().toISOString(),
      timeframe: '30d',
      summary:
        'Revenue is trending up week over week, led by the Enterprise SaaS tier. North America remains the strongest market by both volume and margin.',
      anomalies:
        'Hardware margins are compressed relative to other lines and LATAM volume is thin.',
      actions:
        'Reallocate marketing spend toward Enterprise SaaS in North America and review Hardware fulfillment costs.',
    }
  }
  return g.__BI_TXNS__
}

export function getAiInsight(): AiInsight | null {
  getTransactions()
  return g.__BI_AI__ ?? null
}

export function addTransaction(input: Partial<Transaction>): Transaction {
  const txns = getTransactions()
  const newTxn: Transaction = {
    record_id: `TXN_${Math.floor(100000 + Math.random() * 900000)}`,
    date: input.date || new Date().toISOString().split('T')[0],
    category: input.category || 'General',
    region: input.region || 'Global',
    units: Number(input.units) || 1,
    revenue: Number(input.revenue) || 0,
    cost: Number(input.cost) || 0,
  }
  txns.push(newTxn)
  return newTxn
}
