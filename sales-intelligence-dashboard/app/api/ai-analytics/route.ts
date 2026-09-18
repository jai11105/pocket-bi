import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { analyzeBusiness, generateRCAReport } from '@/lib/ai-analytics'
import type { Transaction, Timeframe } from '@/lib/types'

const VALID_TIMEFRAMES: Timeframe[] = ['7d', '30d', 'all']

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  return createClient(url, key)
}

function mapSupabaseToTransaction(row: any): Transaction {
  return {
    record_id: row.id,
    date: row.date,
    type: row.type,
    category: row.category,
    item_name: row.item_name,
    channel: row.channel,
    quantity: row.quantity,
    amount: row.amount,
    cost_price: row.cost_price,
    notes: row.notes,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const timeframe = searchParams.get('timeframe')

  if (!timeframe || !VALID_TIMEFRAMES.includes(timeframe as Timeframe)) {
    return NextResponse.json(
      { error: 'Invalid or missing timeframe. Must be one of: 7d, 30d, all.' },
      { status: 400 },
    )
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, date, type, category, item_name, channel, amount, cost_price, quantity, notes')
    .order('date', { ascending: false })

  if (error) {
    console.error('[Supabase] Fetch failed:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch transactions.' },
      { status: 500 },
    )
  }

  const transactions = (data ?? []).map(mapSupabaseToTransaction)
  const analysis = analyzeBusiness(transactions, timeframe as Timeframe)
  const rca = generateRCAReport(analysis)

  return NextResponse.json({
    status: 'success',
    timeframe,
    analysis,
    rca,
  })
}
