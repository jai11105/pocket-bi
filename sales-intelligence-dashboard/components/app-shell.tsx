'use client'

import { useState } from 'react'
import {
  buildBreakdown,
  computeMetrics,
  computeTrends,
  filterByTimeframe,
} from '@/lib/analytics'
import type { Timeframe } from '@/lib/types'
import { useData } from '@/lib/use-data'
import { BottomDock, type TabKey } from './bottom-dock'
import { CopilotView } from './copilot-drawer'
import { DashboardView } from './dashboard-view'
import { DataTableView } from './data-table-view'
import { QuickLogSheet } from './quick-log-sheet'

export function AppShell() {
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [timeframe, setTimeframe] = useState<Timeframe>('30d')
  const [logOpen, setLogOpen] = useState(false)
  const { transactions, aiInsight, source, isLoading, addTransaction, refresh } = useData()

  function buildCopilotContext() {
    const filtered = filterByTimeframe(transactions, timeframe)
    const metrics = computeMetrics(filtered)
    return {
      timeframe,
      metrics: {
        total_revenue: Math.round(metrics.totalRevenue),
        total_cost: Math.round(metrics.totalCost),
        gross_profit: Math.round(metrics.grossProfit),
        profit_margin_pct: Number((metrics.profitMargin * 100).toFixed(1)),
        transaction_count: metrics.volume,
        avg_transaction_value: Math.round(metrics.avgTransactionValue),
      },
      trends_vs_previous_period_pct: computeTrends(transactions, timeframe),
      by_category: buildBreakdown(filtered, 'category').map((d) => ({
        name: d.name,
        revenue: Math.round(d.revenue),
        profit: Math.round(d.profit),
        margin_pct: d.revenue > 0 ? Number(((d.profit / d.revenue) * 100).toFixed(1)) : 0,
      })),
      by_region: buildBreakdown(filtered, 'region').map((d) => ({
        name: d.name,
        revenue: Math.round(d.revenue),
        profit: Math.round(d.profit),
        margin_pct: d.revenue > 0 ? Number(((d.profit / d.revenue) * 100).toFixed(1)) : 0,
      })),
    }
  }

  function handleTabChange(key: TabKey) {
    if (key === 'log') {
      setLogOpen(true)
      return
    }
    setTab(key)
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl">
      <main className="px-4 pb-28 pt-6">
        {tab === 'dashboard' ? (
          <DashboardView
            transactions={transactions}
            aiInsight={aiInsight}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            source={source}
            onRefresh={refresh}
            isLoading={isLoading}
          />
        ) : null}

        {tab === 'table' ? <DataTableView transactions={transactions} /> : null}

        {tab === 'copilot' ? (
          <div className="h-[calc(100vh-8.5rem)]">
            <CopilotView buildContext={buildCopilotContext} />
          </div>
        ) : null}
      </main>

      <QuickLogSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onSubmit={async (t) => {
          await addTransaction(t)
          setTab('dashboard')
        }}
      />

      <BottomDock active={logOpen ? 'log' : tab} onChange={handleTabChange} />
    </div>
  )
}
