import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { AiInsight, Transaction, TransactionInput, TransactionType } from '@/lib/types'
import { calcTransactionTotals } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const TRANSACTION_TYPES: TransactionType[] = ['sale', 'purchase', 'expense']

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

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, date, type, category, item_name, channel, amount, cost_price, quantity, notes')
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
  const body = (await request.json()) as Partial<TransactionInput>
  const supabase = getSupabase()

  if (!body.type || !TRANSACTION_TYPES.includes(body.type)) {
    return NextResponse.json(
      { status: 'error', message: 'Invalid or missing transaction type.' },
      { status: 400 },
    )
  }
  if (!body.category) {
    return NextResponse.json(
      { status: 'error', message: 'Category is required.' },
      { status: 400 },
    )
  }

  // The server is the source of truth for totals — never trust client totals.
  const input = body as TransactionInput
  const totals = calcTransactionTotals(input)

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      date: body.date,
      type: body.type,
      category: body.category,
      item_name: body.item_name ?? '',
      channel: body.channel ?? '',
      quantity: totals.quantity,
      amount: totals.amount,
      cost_price: totals.cost_price,
      notes: body.notes ?? '',
    })
    .select('id, user_id, date, type, category, item_name, channel, amount, cost_price, quantity, notes')
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