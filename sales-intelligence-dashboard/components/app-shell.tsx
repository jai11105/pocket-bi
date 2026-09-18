'use client'

import { useState } from 'react'
import {
  buildBreakdown,
  computeMetrics,
  computeTrends,
  filterByTimeframe,
} from '@/lib/analytics'
import { analyzeBusiness, generateRCAReport, generateRecommendations } from '@/lib/ai-analytics'
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
    const analysis = analyzeBusiness(transactions, timeframe)
    const rca = generateRCAReport(analysis)
    const recommendations = generateRecommendations(rca)
    return {
      timeframe,
      metrics: {
        sales: Math.round(metrics.sales),
        buyingCost: Math.round(metrics.buyingCost),
        productProfit: Math.round(metrics.productProfit),
        profitPct: Number((metrics.profitPct * 100).toFixed(1)),
        business_expenses: Math.round(metrics.expenses),
        net_profit: Math.round(metrics.netProfit),
        transaction_count: metrics.volume,
        avg_transaction_value: Math.round(metrics.avgTransactionValue),
      },
      trends_vs_previous_period_pct: computeTrends(transactions, timeframe),
      by_category: buildBreakdown(filtered, 'category').map((d) => ({
        name: d.name,
        sales: Math.round(d.sales),
        profit: Math.round(d.profit),
        margin_pct: d.sales > 0 ? Number(((d.profit / d.sales) * 100).toFixed(1)) : 0,
      })),
      by_channel: buildBreakdown(filtered, 'channel').map((d) => ({
        name: d.name,
        sales: Math.round(d.sales),
        profit: Math.round(d.profit),
        margin_pct: d.sales > 0 ? Number(((d.profit / d.sales) * 100).toFixed(1)) : 0,
      })),
      rca_findings: rca.findings,
      recommendations: recommendations.recommendations,
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
