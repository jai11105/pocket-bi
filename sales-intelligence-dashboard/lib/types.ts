export type Transaction = {
  record_id: string
  date: string // YYYY-MM-DD
  category: string
  region: string
  units: number
  revenue: number
  cost: number
}

export type Metrics = {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  profitMargin: number // 0..1
  volume: number
  avgTransactionValue: number
}

export type AiInsight = {
  timestamp: string
  timeframe: string
  summary: string
  anomalies: string
  actions: string
}

export type DataResponse = {
  status: string
  timestamp: string
  transactions: Transaction[]
  ai_insights: AiInsight | null
}

export type Timeframe = 'today' | '7d' | '30d' | 'all'

export const CATEGORIES = [
  'Enterprise SaaS',
  'SMB Subscriptions',
  'Professional Services',
  'Marketplace',
  'Hardware',
] as const

export const REGIONS = ['North America', 'EMEA', 'APAC', 'LATAM'] as const
