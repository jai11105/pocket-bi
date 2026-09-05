// Rule-based analytics responder used when the AI Gateway is unavailable
// (e.g. no billing card on file). It answers common BI questions directly
// from the dashboard snapshot so the Copilot always works live.

type Breakdown = { name: string; revenue: number; profit: number; margin_pct: number }
type Context = {
  timeframe: string
  metrics: {
    total_revenue: number
    total_cost: number
    gross_profit: number
    profit_margin_pct: number
    transaction_count: number
    avg_transaction_value: number
  }
  trends_vs_previous_period_pct: { revenue: number; profit: number; margin: number; volume: number }
  by_category: Breakdown[]
  by_region: Breakdown[]
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

const TIMEFRAME_LABEL: Record<string, string> = {
  today: 'today',
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
  all: 'all time',
}

export function localCopilotAnswer(question: string, ctx: Context): string {
  const q = question.toLowerCase()
  const period = TIMEFRAME_LABEL[ctx.timeframe] ?? ctx.timeframe
  const dim = q.includes('region') ? 'region' : q.includes('categor') || q.includes('product') ? 'category' : null
  const list = (d: 'region' | 'category') => (d === 'region' ? ctx.by_region : ctx.by_category)

  // Lowest / worst margin
  if (/(lowest|worst|weakest|smallest).*(margin|profit)|(margin|profit).*(lowest|worst|weakest)/.test(q)) {
    const d = dim ?? 'region'
    const items = [...list(d)].sort((a, b) => a.margin_pct - b.margin_pct)
    const w = items[0]
    if (!w) return noData()
    return [
      `${w.name} has the lowest profit margin by ${d} at ${w.margin_pct}% over ${period}.`,
      ...items.slice(0, 3).map((i) => `- ${i.name}: ${i.margin_pct}% margin on ${money(i.revenue)} revenue`),
      `Recommended action: review pricing and cost structure for ${w.name} to lift its margin.`,
    ].join('\n')
  }

  // Highest / best margin or performer
  if (/(highest|best|top|strongest|most profitable).*(margin|profit|perform|categor|region|product)/.test(q)) {
    const d = dim ?? 'category'
    const byMargin = q.includes('margin')
    const items = [...list(d)].sort((a, b) => (byMargin ? b.margin_pct - a.margin_pct : b.revenue - a.revenue))
    const top = items[0]
    if (!top) return noData()
    const metric = byMargin ? `${top.margin_pct}% margin` : `${money(top.revenue)} in revenue`
    return [
      `${top.name} is the strongest ${d} with ${metric} over ${period}.`,
      ...items.slice(0, 3).map((i) => `- ${i.name}: ${money(i.revenue)} revenue, ${i.margin_pct}% margin`),
      `Recommended action: double down on ${top.name} where returns are highest.`,
    ].join('\n')
  }

  // Cost cutting
  if (/(cut|reduce|lower|save).*(cost|spend|expense)|where.*(cost|expensive)/.test(q)) {
    const items = [...ctx.by_category].sort((a, b) => a.margin_pct - b.margin_pct)
    const worst = items[0]
    if (!worst) return noData()
    return [
      `The best cost-cutting opportunities are in your lowest-margin lines, led by ${worst.name} at ${worst.margin_pct}% margin.`,
      ...items.slice(0, 3).map((i) => `- ${i.name}: ${money(i.revenue - i.profit)} cost against ${money(i.revenue)} revenue`),
      `Recommended action: audit fulfillment and delivery costs for ${worst.name} first.`,
    ].join('\n')
  }

  // Compare / trend / summary
  if (/(summar|overview|how.*doing|trend|compare|vs|versus|week|performance)/.test(q)) {
    const t = ctx.trends_vs_previous_period_pct
    return [
      `Over ${period} you generated ${money(ctx.metrics.total_revenue)} revenue at a ${ctx.metrics.profit_margin_pct}% margin.`,
      `- Revenue ${signed(t.revenue)} vs the previous period`,
      `- Gross profit ${money(ctx.metrics.gross_profit)} (${signed(t.profit)})`,
      `- ${ctx.metrics.transaction_count} transactions, avg ${money(ctx.metrics.avg_transaction_value)}`,
      `Recommended action: keep momentum where revenue is growing and shore up any declining ${ctx.by_region[0] ? 'regions' : 'lines'}.`,
    ].join('\n')
  }

  // Fallback general answer
  return [
    `Here is a snapshot for ${period}.`,
    `- Revenue: ${money(ctx.metrics.total_revenue)} (${signed(ctx.trends_vs_previous_period_pct.revenue)})`,
    `- Gross profit: ${money(ctx.metrics.gross_profit)} at ${ctx.metrics.profit_margin_pct}% margin`,
    `- Top category: ${ctx.by_category[0]?.name ?? 'n/a'}; top region: ${ctx.by_region[0]?.name ?? 'n/a'}`,
    `Recommended action: ask about a specific region, category, margin, or cost for a focused analysis.`,
  ].join('\n')
}

function noData() {
  return 'There is no data in the current timeframe to answer that. Try widening the timeframe on the dashboard.'
}
