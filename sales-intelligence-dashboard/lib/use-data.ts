'use client'

import useSWR from 'swr'
import type { DataResponse, Transaction, TransactionInput } from './types'
import { calcTransactionTotals } from '@/lib/analytics'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useData() {
  const { data, error, isLoading, mutate } = useSWR<DataResponse>('/api/data', fetcher, {
    revalidateOnFocus: false,
  })

  async function addTransaction(input: TransactionInput) {
    const totals = calcTransactionTotals(input)
    const optimistic: Transaction = {
      record_id: `TXN_pending`,
      date: input.date,
      type: input.type,
      category: input.category,
      item_name: input.item_name,
      channel: input.channel ?? '',
      quantity: totals.quantity,
      amount: totals.amount,
      cost_price: totals.cost_price,
      notes: input.notes ?? '',
    }
    await mutate(
      async (current) => {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const base = current ?? { status: 'success', timestamp: '', transactions: [], ai_insights: null }
        const created: Transaction = { ...optimistic, record_id: `TXN_${Date.now()}` }
        return { ...base, transactions: [...base.transactions, created] }
      },
      {
        optimisticData: (current) => {
          const base = current ?? { status: 'success', timestamp: '', transactions: [], ai_insights: null }
          return { ...base, transactions: [...base.transactions, optimistic] }
        },
        rollbackOnError: true,
        revalidate: false,
      },
    )
    setTimeout(() => mutate(), 1500)
  }

  return {
    transactions: data?.transactions ?? [],
    aiInsight: data?.ai_insights ?? null,
    source: (data as DataResponse & { source?: string })?.source ?? 'demo',
    isLoading,
    error,
    addTransaction,
    refresh: () => mutate(),
  }
}