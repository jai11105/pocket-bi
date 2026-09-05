'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/analytics'
import type { Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

type SortKey = 'date' | 'category' | 'region' | 'revenue' | 'cost' | 'profit'

export function DataTableView({ transactions }: { transactions: Transaction[] }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = transactions.filter(
      (t) =>
        !q ||
        t.record_id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q),
    )
    const withProfit = filtered.map((t) => ({ ...t, profit: t.revenue - t.cost }))
    withProfit.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return dir === 'asc' ? cmp : -cmp
    })
    return withProfit
  }, [transactions, query, sortKey, dir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setDir(dir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setDir(key === 'date' || key === 'category' || key === 'region' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Transactions</h1>
        <p className="text-xs text-muted-foreground">{rows.length} records</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search id, category, region…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <Th onClick={() => toggleSort('date')} active={sortKey === 'date'}>Date</Th>
                <Th onClick={() => toggleSort('category')} active={sortKey === 'category'}>Category</Th>
                <Th onClick={() => toggleSort('region')} active={sortKey === 'region'}>Region</Th>
                <Th onClick={() => toggleSort('revenue')} active={sortKey === 'revenue'} align="right">Rev</Th>
                <Th onClick={() => toggleSort('profit')} active={sortKey === 'profit'} align="right">Profit</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.record_id} className="border-b border-border/40 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-2.5 text-card-foreground">{t.category}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.region}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-card-foreground">
                    {formatCurrency(t.revenue, true)}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-3 py-2.5 text-right font-medium',
                      t.profit >= 0 ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {formatCurrency(t.profit, true)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No matching records.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  align = 'left',
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  align?: 'left' | 'right'
}) {
  return (
    <th className={cn('px-3 py-2.5 font-semibold', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
          active && 'text-primary',
        )}
      >
        {children}
        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  )
}
