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
  by_channel: Breakdown[]
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

const TIMEFRAME_LABEL_TA: Record<string, string> = {
  today: 'inaiku',
  '7d': 'last 7 naal',
  '30d': 'last 30 naal',
  all: 'ellaa neramum',
}

// Tanglish / Tamil cue words. If any appear (or Tamil script is present) we reply
// in conversational Tanglish so the copilot matches how the user asked.
const TANGLISH_CUES =
  /(evlo|enna|ena|edhu|edho|yaaru|yaru|inaiku|indha|romba|nalla|mosam|kammi|adhigam|laabam|varipadi|mame|machi|ready ah|panna|solu|epdi|eppadi|vandhu)/

function isTanglish(q: string): boolean {
  return /[\u0B80-\u0BFF]/.test(q) || TANGLISH_CUES.test(q)
}

export function localCopilotAnswer(question: string, ctx: Context): string {
  const q = question.toLowerCase()
  const ta = isTanglish(q)
  const period = (ta ? TIMEFRAME_LABEL_TA : TIMEFRAME_LABEL)[ctx.timeframe] ?? ctx.timeframe
  const dim = /channel|counter|online|whatsapp|mandi/.test(q) ? 'channel' : /categor|product|vagai/.test(q) ? 'category' : null
  const list = (d: 'channel' | 'category') => (d === 'channel' ? ctx.by_channel : ctx.by_category)
  const dimTa = (d: 'channel' | 'category') => (d === 'channel' ? 'channel' : 'category')

  // Lowest / worst margin
  if (
    /(lowest|worst|weakest|smallest|mosam|kammi).*(margin|profit|channel|categor|laabam|sales)|(margin|profit|laabam).*(lowest|worst|weakest|mosam|kammi)/.test(
      q,
    )
  ) {
    const d = dim ?? 'channel'
    const items = [...list(d)].sort((a, b) => a.margin_pct - b.margin_pct)
    const w = items[0]
    if (!w) return noData(ta)
    if (ta) {
      return [
        `${period} la worst performing ${dimTa(d)} ${w.name} thaan machi — margin verum ${w.margin_pct}% dhaan.`,
        ...items.slice(0, 3).map((i) => `- ${i.name}: ${i.margin_pct}% margin, ${money(i.revenue)} revenue`),
        `Panna vendiyathu: ${w.name} oda pricing and cost-a review pannunga, margin-a kootta.`,
      ].join('\n')
    }
    return [
      `${w.name} has the lowest profit margin by ${d} at ${w.margin_pct}% over ${period}.`,
      ...items.slice(0, 3).map((i) => `- ${i.name}: ${i.margin_pct}% margin on ${money(i.revenue)} revenue`),
      `Recommended action: review pricing and cost structure for ${w.name} to lift its margin.`,
    ].join('\n')
  }

  // Highest / best margin or performer
  if (
    /(highest|best|top|strongest|most profitable|nalla|adhigam).*(margin|profit|perform|channel|categor|product|laabam|sales)/.test(
      q,
    )
  ) {
    const d = dim ?? 'category'
    const byMargin = /margin|laabam/.test(q)
    const items = [...list(d)].sort((a, b) => (byMargin ? b.margin_pct - a.margin_pct : b.revenue - a.revenue))
    const top = items[0]
    if (!top) return noData(ta)
    if (ta) {
      const metric = byMargin ? `${top.margin_pct}% margin` : `${money(top.revenue)} revenue`
      return [
        `${period} la best ${dimTa(d)} ${top.name} thaan mame — ${metric} pannirukku.`,
        ...items.slice(0, 3).map((i) => `- ${i.name}: ${money(i.revenue)} revenue, ${i.margin_pct}% margin`),
        `Panna vendiyathu: ${top.name} mela innum focus pannunga, adhu dhaan nalla varudhu.`,
      ].join('\n')
    }
    const metric = byMargin ? `${top.margin_pct}% margin` : `${money(top.revenue)} in revenue`
    return [
      `${top.name} is the strongest ${d} with ${metric} over ${period}.`,
      ...items.slice(0, 3).map((i) => `- ${i.name}: ${money(i.revenue)} revenue, ${i.margin_pct}% margin`),
      `Recommended action: double down on ${top.name} where returns are highest.`,
    ].join('\n')
  }

  // Cost cutting
  if (/(cut|reduce|lower|save|kammi panna).*(cost|spend|expense|selavu)|where.*(cost|expensive|selavu)/.test(q)) {
    const items = [...ctx.by_category].sort((a, b) => a.margin_pct - b.margin_pct)
    const worst = items[0]
    if (!worst) return noData(ta)
    if (ta) {
      return [
        `Cost kammi panna best idam un low-margin lines thaan, ${worst.name} (${worst.margin_pct}% margin) la irundhu start pannunga.`,
        ...items.slice(0, 3).map((i) => `- ${i.name}: ${money(i.revenue - i.profit)} cost, ${money(i.revenue)} revenue`),
        `Panna vendiyathu: ${worst.name} oda fulfillment and delivery selavu-a mudhalla audit pannunga.`,
      ].join('\n')
    }
    return [
      `The best cost-cutting opportunities are in your lowest-margin lines, led by ${worst.name} at ${worst.margin_pct}% margin.`,
      ...items.slice(0, 3).map((i) => `- ${i.name}: ${money(i.revenue - i.profit)} cost against ${money(i.revenue)} revenue`),
      `Recommended action: audit fulfillment and delivery costs for ${worst.name} first.`,
    ].join('\n')
  }

  // Compare / trend / summary  (also matches "sales ena", "evlo")
  if (/(summar|overview|how.*doing|trend|compare|vs|versus|week|performance|sales|revenue|evlo|ena|epdi)/.test(q)) {
    const t = ctx.trends_vs_previous_period_pct
    if (ta) {
      return [
        `${period} la neenga ${money(ctx.metrics.total_revenue)} sales panniyirukeenga, margin ${ctx.metrics.profit_margin_pct}%.`,
        `- Revenue ${signed(t.revenue)} (last period-oda compare panna)`,
        `- Gross profit ${money(ctx.metrics.gross_profit)} (${signed(t.profit)})`,
        `- ${ctx.metrics.transaction_count} transactions, average ${money(ctx.metrics.avg_transaction_value)}`,
        `Panna vendiyathu: revenue kooduthu irukkura idathula momentum-a keep pannunga, kammi aagura line-a shore up pannunga.`,
      ].join('\n')
    }
    return [
      `Over ${period} you generated ${money(ctx.metrics.total_revenue)} revenue at a ${ctx.metrics.profit_margin_pct}% margin.`,
      `- Revenue ${signed(t.revenue)} vs the previous period`,
      `- Gross profit ${money(ctx.metrics.gross_profit)} (${signed(t.profit)})`,
      `- ${ctx.metrics.transaction_count} transactions, avg ${money(ctx.metrics.avg_transaction_value)}`,
      `Recommended action: keep momentum where revenue is growing and shore up any declining ${ctx.by_channel[0] ? 'channels' : 'lines'}.`,
    ].join('\n')
  }

  // Fallback general answer
  if (ta) {
    return [
      `${period} oda quick snapshot itho mame.`,
      `- Revenue: ${money(ctx.metrics.total_revenue)} (${signed(ctx.trends_vs_previous_period_pct.revenue)})`,
      `- Gross profit: ${money(ctx.metrics.gross_profit)}, margin ${ctx.metrics.profit_margin_pct}%`,
      `- Top category: ${ctx.by_category[0]?.name ?? 'n/a'}; top region: ${ctx.by_channel[0]?.name ?? 'n/a'}`,
      `Panna vendiyathu: oru specific region, category, margin illa cost pathi kelunga, detail-a solren.`,
    ].join('\n')
  }
  return [
    `Here is a snapshot for ${period}.`,
    `- Revenue: ${money(ctx.metrics.total_revenue)} (${signed(ctx.trends_vs_previous_period_pct.revenue)})`,
    `- Gross profit: ${money(ctx.metrics.gross_profit)} at ${ctx.metrics.profit_margin_pct}% margin`,
    `- Top category: ${ctx.by_category[0]?.name ?? 'n/a'}; top region: ${ctx.by_channel[0]?.name ?? 'n/a'}`,
    `Recommended action: ask about a specific region, category, margin, or cost for a focused analysis.`,
  ].join('\n')
}

function noData(ta = false) {
  return ta
    ? 'Indha timeframe la data illa mame. Dashboard la timeframe-a konjam widen panni paarunga.'
    : 'There is no data in the current timeframe to answer that. Try widening the timeframe on the dashboard.'
}
