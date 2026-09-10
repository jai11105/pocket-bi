import { NextResponse } from 'next/server'
import { addTransaction, getAiInsight, getTransactions } from '@/lib/store'
import type { AiInsight, Transaction } from '@/lib/types'

const SHEET_URL = process.env.GOOGLE_APPS_SCRIPT_URL

export const dynamic = 'force-dynamic'

// Normalizes the Google Apps Script payload (metrics/recent_transactions/ai_insights)
// into the transaction list the app consumes. When no sheet is configured we serve
// the in-memory demo backend instead.
export async function GET() {
  if (SHEET_URL) {
    try {
      const res = await fetch(SHEET_URL, { cache: 'no-store' })
      const json = await res.json()
      const transactions: Transaction[] = (json.recent_transactions ?? []).map(normalizeTxn)
      const ai = json.ai_insights
        ? ({
            timestamp: json.ai_insights.timestamp ?? new Date().toISOString(),
            timeframe: json.ai_insights.timeframe ?? 'all',
            summary: json.ai_insights.summary ?? '',
            anomalies: json.ai_insights.anomalies ?? '',
            actions: json.ai_insights.actions ?? '',
          } satisfies AiInsight)
        : null
      return NextResponse.json({
        status: 'success',
        timestamp: new Date().toISOString(),
        source: 'google_sheets',
        transactions,
        ai_insights: ai,
      })
    } catch (err) {
      // Fall through to demo data if the sheet is unreachable.
      console.log('[v0] Google Sheets fetch failed, using demo data:', String(err))
    }
  }

  return NextResponse.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    source: 'demo',
    transactions: getTransactions(),
    ai_insights: getAiInsight(),
  })
}

export async function POST(request: Request) {
  const body = await request.json()

  if (SHEET_URL) {
    try {
      const res = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      return NextResponse.json(json)
    } catch (err) {
      console.log('[v0] Google Sheets POST failed, using demo store:', String(err))
    }
  }

  const created = addTransaction(body)
  return NextResponse.json({ status: 'success', record_id: created.record_id, transaction: created })
}

function normalizeTxn(raw: Record<string, unknown>): Transaction {
  return {
    record_id: String(raw.record_id ?? ''),
    date: String(raw.date ?? '').slice(0, 10),
    category: String(raw.category ?? 'General'),
    region: String(raw.region ?? 'Global'),
    units: Number(raw.units ?? 0),
    revenue: Number(raw.revenue ?? 0),
    cost: Number(raw.cost ?? 0),
  }
}
