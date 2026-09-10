'use client'

import useSWR from 'swr'
import type { DataResponse, Transaction } from './types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useData() {
  const { data, error, isLoading, mutate } = useSWR<DataResponse>('/api/data', fetcher, {
    revalidateOnFocus: false,
  })

  async function addTransaction(input: Omit<Transaction, 'record_id'>) {
    const optimistic: Transaction = { record_id: `TXN_pending`, ...input }
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