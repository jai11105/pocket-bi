export type Transaction = {
  record_id: string
  date: string // YYYY-MM-DD
  type: string
  category: string
  item_name: string
  channel: string
  quantity: number
  amount: number
  cost_price: number
  notes: string
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
  'Grocery',
  'Vegetables',
  'Tea/Tiffin',
  'Petrol',
  'Rent',
] as const

export const CHANNELS = ['Counter', 'Online', 'WhatsApp', 'Mandi'] as const
