export type TransactionType = 'sale' | 'purchase' | 'expense'

export type Transaction = {
  record_id: string
  date: string // YYYY-MM-DD
  type: TransactionType
  category: string
  item_name: string
  channel: string
  quantity: number
  amount: number
  cost_price: number
  notes: string
}

export type Metrics = {
  sales: number
  buyingCost: number
  productProfit: number
  profitPct: number // 0..1
  expenses: number
  netProfit: number
  volume: number
  avgTransactionValue: number
}

export interface TransactionInput {
  type: TransactionType
  date: string
  category: string
  item_name: string
  channel: string
  quantity: number
  buying_price?: number
  selling_price?: number
  amount?: number
  notes: string
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
