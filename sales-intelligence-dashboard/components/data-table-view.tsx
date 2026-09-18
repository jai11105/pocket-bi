'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/analytics'
import type { Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

type TableRow = {
  record_id: string
  date: string
  type: string
  category: string
  item_name: string
  channel: string
  quantity: number
  amount: number
  cost_price: number
  notes: string
}

type SortKey = 'date' | 'type' | 'category' | 'item_name' | 'channel' | 'quantity' | 'amount' | 'cost_price' | 'sales' | 'buyingCost' | 'profit' | 'neutralAmount'

export function DataTableView({ transactions }: { transactions: Transaction[] }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => {
    const tableRows = transactions as TableRow[]
    const q = query.trim().toLowerCase()
    const filtered = tableRows.filter(
      (t) =>
        !q ||
        t.record_id.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.item_name ?? '').toLowerCase().includes(q) ||
        (t.channel ?? '').toLowerCase().includes(q),
    )
    const withValues = filtered.map((t) => {
      const sales = t.type === 'sale' ? t.amount : 0
      const buyingCost = (t.type === 'sale' || t.type === 'purchase') ? t.cost_price : 0
      const profit = t.type === 'sale' ? t.amount - t.cost_price : 0
      const neutralAmount = t.type === 'expense' ? t.amount : (t.type === 'purchase' ? t.cost_price : t.amount)
      return { ...t, sales, buyingCost, profit, neutralAmount }
    })
    withValues.sort((a, b) => {
      const av = a[sortKey] as number | string
      const bv = b[sortKey] as number | string
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return dir === 'asc' ? cmp : -cmp
    })
    return withValues
  }, [transactions, query, sortKey, dir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setDir(dir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setDir(
        key === 'date' || key === 'type' || key === 'category' || key === 'item_name' || key === 'channel'
          ? 'asc'
          : 'desc',
      )
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
          placeholder="Search id, type, category, item, channel…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <Th onClick={() => toggleSort('date')} active={sortKey === 'date'}>Date</Th>
                <Th onClick={() => toggleSort('type')} active={sortKey === 'type'}>Type</Th>
                <Th onClick={() => toggleSort('category')} active={sortKey === 'category'}>Category</Th>
                <Th onClick={() => toggleSort('item_name')} active={sortKey === 'item_name'}>Product</Th>
                <Th onClick={() => toggleSort('channel')} active={sortKey === 'channel'}>Channel</Th>
                <Th onClick={() => toggleSort('quantity')} active={sortKey === 'quantity'} align="right">Qty</Th>
                <Th onClick={() => toggleSort('sales')} active={sortKey === 'sales'} align="right">Sales</Th>
                <Th onClick={() => toggleSort('buyingCost')} active={sortKey === 'buyingCost'} align="right">Buying Cost</Th>
                <Th onClick={() => toggleSort('profit')} active={sortKey === 'profit'} align="right">Profit</Th>
                <Th onClick={() => toggleSort('neutralAmount')} active={sortKey === 'neutralAmount'} align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.record_id} className="border-b border-border/40 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-2.5 text-card-foreground">{t.type}</td>
                  <td className="px-3 py-2.5 text-card-foreground">{t.category}</td>
                  <td className="px-3 py-2.5 text-card-foreground">{t.item_name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.channel}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-card-foreground">
                    {t.quantity}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-card-foreground">
                    {t.type === 'sale' ? formatCurrency(t.sales, true) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-card-foreground">
                    {t.type === 'sale' || t.type === 'purchase' ? formatCurrency(t.buyingCost, true) : '—'}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-3 py-2.5 text-right font-medium',
                      t.type === 'sale'
                        ? t.profit >= 0
                          ? 'text-positive'
                          : 'text-negative'
                        : 'text-muted-foreground',
                    )}
                  >
                    {t.type === 'sale' ? formatCurrency(t.profit, true) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground">
                    {formatCurrency(t.neutralAmount, true)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
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
