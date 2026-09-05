'use client'

import useSWR from 'swr'
import type { DataResponse, Transaction } from './types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useData() {
  const { data, error, isLoading, mutate } = useSWR<DataResponse>('/api/data', fetcher, {
    revalidateOnFocus: false,
  })

  async function addTransaction(input: Omit<Transaction, 'record_id'>) {
    // Optimistic update: show the row instantly, then reconcile with the server.
    const optimistic: Transaction = { record_id: `TXN_pending`, ...input }
    await mutate(
      async (current) => {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const json = await res.json()
        const created: Transaction = json.transaction ?? { ...optimistic, record_id: json.record_id }
        const base = current ?? { status: 'success', timestamp: '', transactions: [], ai_insights: null }
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
