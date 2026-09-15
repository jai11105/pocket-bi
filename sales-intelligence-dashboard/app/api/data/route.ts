import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { AiInsight, Transaction } from '@/lib/types'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  return createClient(url, key)
}

function mapSupabaseToTransaction(row: any): Transaction {
  return {
    record_id: row.id,
    date: row.date,
    category: row.category || row.type || 'General',
    region: row.region || 'Global',
    units: row.quantity || 1,
    revenue: row.amount || 0,
    cost: row.cost_price || 0,
  }
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, date, type, category, amount, cost_price, quantity')
    .order('date', { ascending: false })

  if (error) {
    console.error('[Supabase] Fetch failed:', error.message)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        source: 'supabase',
        transactions: [],
        ai_insights: null,
      },
      { status: 500 },
    )
  }

  const transactions = (data ?? []).map(mapSupabaseToTransaction)

  return NextResponse.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    source: 'supabase',
    transactions,
    ai_insights: null,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      date: body.date,
      category: body.category,
      quantity: body.units || 1,
      amount: body.revenue || 0,
      cost_price: body.cost || 0,
    })
    .select('id, user_id, date, type, category, amount, cost_price, quantity')
    .single()

  if (error) {
    console.error('[Supabase] Insert failed:', error.message)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    status: 'success',
    record_id: data.id,
    transaction: mapSupabaseToTransaction(data),
  })
}