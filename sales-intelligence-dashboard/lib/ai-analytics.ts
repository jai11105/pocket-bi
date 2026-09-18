import type { Transaction, Timeframe, TransactionType } from './types'
import { computeMetrics, buildBreakdown, startOfTimeframe } from './analytics'

export interface ChangeAnalysis {
  current: number
  previous: number
  change: number
  changePct: number
  direction: 'up' | 'down' | 'flat'
}

export interface CategoryChange {
  name: string
  current: number
  previous: number
  change: number
  changePct: number
  direction: 'up' | 'down' | 'flat'
}

export interface ChannelChange {
  name: string
  current: number
  previous: number
  change: number
  changePct: number
  direction: 'up' | 'down' | 'flat'
}

export interface AIAnalysis {
  timeframe: Timeframe
  sales: ChangeAnalysis
  buyingCost: ChangeAnalysis
  productProfit: ChangeAnalysis
  businessExpenses: ChangeAnalysis
  netProfit: ChangeAnalysis
  categoryBreakdown: CategoryChange[]
  channelBreakdown: ChannelChange[]
  buyingCostByCategory: CategoryChange[]
  businessExpensesByCategory: CategoryChange[]
}

export function analyzeBusiness(transactions: Transaction[], timeframe: Timeframe): AIAnalysis {
  const { current, previous } = splitPeriods(transactions, timeframe)
  const cm = computeMetrics(current)
  const pm = computeMetrics(previous)

  return {
    timeframe,
    sales: analyzeChange(cm.sales, pm.sales),
    buyingCost: analyzeChange(cm.buyingCost, pm.buyingCost),
    productProfit: analyzeChange(cm.productProfit, pm.productProfit),
    businessExpenses: analyzeChange(cm.expenses, pm.expenses),
    netProfit: analyzeChange(cm.netProfit, pm.netProfit),
    categoryBreakdown: analyzeBreakdown(current, previous, 'category'),
    channelBreakdown: analyzeBreakdown(current, previous, 'channel'),
    buyingCostByCategory: analyzeBuyingCostByCategory(current, previous),
    businessExpensesByCategory: analyzeBusinessExpensesByCategory(current, previous),
  }
}

export interface RCAResult {
  issue: string
  root_cause: string
  evidence: string[]
  impact: string
  confidence: 'high' | 'medium' | 'low'
}

export interface RCAReport {
  findings: RCAResult[]
}

export interface Recommendation {
  issue: string
  action: string
  evidence: string[]
  confidence: 'high' | 'medium' | 'low'
  priority: 'high' | 'medium' | 'low'
}

export interface RecommendationReport {
  recommendations: Recommendation[]
}

function issueType(issue: string): string {
  if (issue.includes('Sales decreased')) return 'sales_decrease'
  if (issue.includes('Buying cost increased')) return 'buying_cost_increase'
  if (issue.includes('Product profit decreased')) return 'product_profit_decrease'
  if (issue.includes('Margin deteriorated')) return 'margin_deterioration'
  if (issue.includes('Business expenses increased')) return 'business_expense_increase'
  if (issue.includes('Net profit decreased')) return 'net_profit_decrease'
  return 'unknown'
}

function buildAction(type: string, evidence: string[], confidence: 'high' | 'medium' | 'low'): string {
  const disclaimer = ' This is a suggested action for investigation, not a confirmed cause.'
  switch (type) {
    case 'sales_decrease': {
      const specific = evidence.some((e) => e.includes('Category') || e.includes('Channel'))
      if (!specific) {
        return `Sales decreased but specific contributing categories or channels are not identified from available data. Review sales records by category and channel to identify affected areas.${disclaimer}`
      }
      return `Sales decreased and evidence identifies specific categories and channels with declines. Review demand, pricing, or competitive factors in those areas.${disclaimer}`
    }
    case 'buying_cost_increase': {
      const specific = evidence.some((e) => e.includes('Category'))
      if (!specific) {
        return `Buying cost increased but category-level cost data is insufficient. Review procurement records and supplier pricing for detail.${disclaimer}`
      }
      return `Buying cost increased with category-level evidence available. Review procurement costs, supplier pricing, and volume effects for the affected categories. Consider evaluating sourcing alternatives.${disclaimer}`
    }
    case 'business_expense_increase': {
      const specific = evidence.some((e) => e.includes('Category'))
      if (!specific) {
        return `Business expenses increased but category-level data is insufficient. Review expense records by category for detail.${disclaimer}`
      }
      return `Business expenses increased with category-level evidence available. Review expense categories with increases to determine whether they are driven by volume, pricing changes, or one-time charges.${disclaimer}`
    }
    case 'product_profit_decrease': {
      return `Product profit decreased. Investigate the contributing factors identified in the RCA evidence, addressing both demand-side and cost-side drivers.${disclaimer}`
    }
    case 'margin_deterioration': {
      return `Margin deteriorated. Review pricing relative to cost of goods sold. Evaluate whether the decline is driven by cost increases, price decreases, or sales mix shift.${disclaimer}`
    }
    case 'net_profit_decrease': {
      return `Net profit decreased. Investigate the contributing factors identified in the RCA evidence, including both profitability drivers and operating expense impacts.${disclaimer}`
    }
    default:
      return `Review the identified issue.${disclaimer}`
  }
}

export function generateRecommendations(rca: RCAReport): RecommendationReport {
  const recommendations: Recommendation[] = []

  for (const finding of rca.findings) {
    const type = issueType(finding.issue)
    const action = buildAction(type, finding.evidence, finding.confidence)

    const priority: 'high' | 'medium' | 'low' = finding.confidence

    recommendations.push({
      issue: finding.issue,
      action,
      evidence: [...finding.evidence],
      confidence: finding.confidence,
      priority,
    })
  }

  return { recommendations }
}

export function generateRCAReport(analysis: AIAnalysis): RCAReport {
  const findings: RCAResult[] = []

  const { sales, buyingCost, productProfit, businessExpenses, netProfit } = analysis

  // --- Sales Decrease ---
  if (sales.direction === 'down') {
    const catDeclines = analysis.categoryBreakdown.filter((c) => c.direction === 'down')
    const chDeclines = analysis.channelBreakdown.filter((c) => c.direction === 'down')
    const evidence: string[] = []
    for (const c of catDeclines.slice(0, 3)) {
      evidence.push(`Category "${c.name}" sales decreased ${Math.abs(c.changePct).toFixed(1)}% ($${Math.abs(c.change).toFixed(0)})`)
    }
    for (const c of chDeclines.slice(0, 3)) {
      evidence.push(`Channel "${c.name}" sales decreased ${Math.abs(c.changePct).toFixed(1)}% ($${Math.abs(c.change).toFixed(0)})`)
    }

    let rootCause: string
    let confidence: 'high' | 'medium' | 'low'
    if (catDeclines.length > 0 && chDeclines.length > 0) {
      rootCause = `Sales decreased ${Math.abs(sales.changePct).toFixed(1)}% ($${Math.abs(sales.change).toFixed(0)}). Category and channel data show declines in ${catDeclines.length} categories and ${chDeclines.length} channels. These are contributing observations and do not prove causation for the overall sales decline.`
      confidence = 'high'
    } else if (catDeclines.length > 0 || chDeclines.length > 0) {
      rootCause = `Sales decreased ${Math.abs(sales.changePct).toFixed(1)}% ($${Math.abs(sales.change).toFixed(0)}). Category or channel data shows declines in some segments. These are contributing observations and do not prove causation for the overall sales decline.`
      confidence = 'medium'
    } else {
      rootCause = 'Insufficient data to determine root cause.'
      confidence = 'low'
    }

    findings.push({
      issue: `Sales decreased by ${Math.abs(sales.changePct).toFixed(1)}% ($${Math.abs(sales.change).toFixed(0)})`,
      root_cause: rootCause,
      evidence,
      impact: `Sales dropped from $${sales.previous.toFixed(0)} to $${sales.current.toFixed(0)}, a decrease of $${Math.abs(sales.change).toFixed(0)} (${Math.abs(sales.changePct).toFixed(1)}%)`,
      confidence,
    })
  }

  // --- Buying Cost Increase ---
  if (buyingCost.direction === 'up') {
    const catIncreases = analysis.buyingCostByCategory
      .filter((c) => c.direction === 'up')
      .sort((a, b) => b.change - a.change)

    const evidence: string[] = [
      `Buying cost rose from $${buyingCost.previous.toFixed(0)} to $${buyingCost.current.toFixed(0)}, an increase of $${Math.abs(buyingCost.change).toFixed(0)} (${Math.abs(buyingCost.changePct).toFixed(1)}%)`,
    ]
    for (const c of catIncreases.slice(0, 3)) {
      evidence.push(`Category "${c.name}": buying cost changed from $${c.previous.toFixed(0)} to $${c.current.toFixed(0)} (change: $${c.change.toFixed(0)}, ${c.changePct > 0 ? '+' : ''}${c.changePct.toFixed(1)}%)`)
    }

    let rootCause: string
    let confidence: 'high' | 'medium' | 'low'
    if (catIncreases.length > 1) {
      rootCause = `Buying cost increased by ${buyingCost.changePct.toFixed(1)}% ($${buyingCost.change.toFixed(0)}). Category-level evidence shows increases in ${catIncreases.length} categories, with "${catIncreases[0].name}" contributing the most. These are contributing observations and do not prove causation.`
      confidence = 'high'
    } else if (catIncreases.length === 1) {
      rootCause = `Buying cost increased by ${buyingCost.changePct.toFixed(1)}% ($${buyingCost.change.toFixed(0)}). Category-level evidence shows "${catIncreases[0].name}" as the sole category with an increase. This is a contributing observation and does not prove causation.`
      confidence = 'medium'
    } else {
      rootCause = 'Insufficient data to determine root cause. Buying cost increased but category-level buying cost data is unavailable.'
      confidence = 'low'
    }

    findings.push({
      issue: `Buying cost increased by ${Math.abs(buyingCost.changePct).toFixed(1)}% ($${Math.abs(buyingCost.change).toFixed(0)})`,
      root_cause: rootCause,
      evidence,
      impact: `Buying cost increased by $${Math.abs(buyingCost.change).toFixed(0)} (${Math.abs(buyingCost.changePct).toFixed(1)}%)`,
      confidence,
    })
  }

  // --- Product Profit Decrease ---
  if (productProfit.direction === 'down') {
    const evidence: string[] = []
    if (sales.direction === 'down') {
      evidence.push(`Sales decreased by ${Math.abs(sales.changePct).toFixed(1)}% ($${Math.abs(sales.change).toFixed(0)})`)
    }
    if (buyingCost.direction === 'up') {
      evidence.push(`Buying cost increased by ${Math.abs(buyingCost.changePct).toFixed(1)}% ($${Math.abs(buyingCost.change).toFixed(0)})`)
    }
    if (evidence.length === 0) {
      evidence.push(`Product profit decreased from $${productProfit.previous.toFixed(0)} to $${productProfit.current.toFixed(0)}`)
    }

    const contributors: string[] = []
    if (sales.direction === 'down') contributors.push('sales decrease')
    if (buyingCost.direction === 'up') contributors.push('buying cost increase')
    const rootCause = contributors.length > 0
      ? `Product profit decreased by ${Math.abs(productProfit.changePct).toFixed(1)}% ($${Math.abs(productProfit.change).toFixed(0)}). Observed contributing factors: ${contributors.join(' and ')}. These are correlated observations and do not prove causation.`
      : 'Insufficient data to determine root cause.'

    findings.push({
      issue: `Product profit decreased by ${Math.abs(productProfit.changePct).toFixed(1)}% ($${Math.abs(productProfit.change).toFixed(0)})`,
      root_cause: rootCause,
      evidence,
      impact: `Product profit dropped from $${productProfit.previous.toFixed(0)} to $${productProfit.current.toFixed(0)}, a decrease of $${Math.abs(productProfit.change).toFixed(0)} (${Math.abs(productProfit.changePct).toFixed(1)}%)`,
      confidence: contributors.length > 1 ? 'high' : contributors.length === 1 ? 'medium' : 'low',
    })
  }

  // --- Margin Deterioration ---
  const currentMargin = sales.current > 0 ? (productProfit.current / sales.current) * 100 : 0
  const previousMargin = sales.previous > 0 ? (productProfit.previous / sales.previous) * 100 : 0
  if (currentMargin < previousMargin) {
    const marginDrop = previousMargin - currentMargin
    const evidence: string[] = [
      `Margin fell from ${previousMargin.toFixed(1)}% to ${currentMargin.toFixed(1)}% (${marginDrop.toFixed(1)} percentage points)`,
      `Sales: ${sales.direction === 'down' ? `decreased ${Math.abs(sales.changePct).toFixed(1)}%` : `changed ${sales.changePct.toFixed(1)}%`}`,
      `Buying cost: ${buyingCost.direction === 'up' ? `increased ${Math.abs(buyingCost.changePct).toFixed(1)}%` : buyingCost.direction === 'down' ? `decreased ${Math.abs(buyingCost.changePct).toFixed(1)}%` : 'flat'}`,
    ]

    findings.push({
      issue: `Margin deteriorated by ${marginDrop.toFixed(1)} percentage points (${previousMargin.toFixed(1)}% → ${currentMargin.toFixed(1)}%)`,
      root_cause: `Margin fell ${marginDrop.toFixed(1)} percentage points. Buying cost changed ${buyingCost.direction} while sales changed ${sales.direction}. Category-level cost breakdown is unavailable for deeper root cause analysis.`,
      evidence,
      impact: `Profit margin dropped from ${previousMargin.toFixed(1)}% to ${currentMargin.toFixed(1)}%, a decline of ${marginDrop.toFixed(1)} percentage points`,
      confidence: 'medium',
    })
  }

  // --- Business Expense Increase ---
  if (businessExpenses.direction === 'up') {
    const catIncreases = analysis.businessExpensesByCategory
      .filter((c) => c.direction === 'up')
      .sort((a, b) => b.change - a.change)

    const evidence: string[] = [
      `Business expenses rose from $${businessExpenses.previous.toFixed(0)} to $${businessExpenses.current.toFixed(0)}, an increase of $${Math.abs(businessExpenses.change).toFixed(0)} (${Math.abs(businessExpenses.changePct).toFixed(1)}%)`,
    ]
    for (const c of catIncreases.slice(0, 3)) {
      evidence.push(`Category "${c.name}": expenses changed from $${c.previous.toFixed(0)} to $${c.current.toFixed(0)} (change: $${c.change.toFixed(0)}, ${c.changePct > 0 ? '+' : ''}${c.changePct.toFixed(1)}%)`)
    }

    let rootCause: string
    let confidence: 'high' | 'medium' | 'low'
    if (catIncreases.length > 1) {
      rootCause = `Business expenses increased by ${businessExpenses.changePct.toFixed(1)}% ($${businessExpenses.change.toFixed(0)}). Category-level evidence shows increases in ${catIncreases.length} categories, with "${catIncreases[0].name}" contributing the most. These are contributing observations and do not prove causation.`
      confidence = 'high'
    } else if (catIncreases.length === 1) {
      rootCause = `Business expenses increased by ${businessExpenses.changePct.toFixed(1)}% ($${businessExpenses.change.toFixed(0)}). Category-level evidence shows "${catIncreases[0].name}" as the sole category with an increase. This is a contributing observation and does not prove causation.`
      confidence = 'medium'
    } else {
      rootCause = 'Insufficient data to determine root cause. Business expenses increased but category-level expense data is unavailable.'
      confidence = 'low'
    }

    findings.push({
      issue: `Business expenses increased by ${Math.abs(businessExpenses.changePct).toFixed(1)}% ($${Math.abs(businessExpenses.change).toFixed(0)})`,
      root_cause: rootCause,
      evidence,
      impact: `Business expenses increased by $${Math.abs(businessExpenses.change).toFixed(0)} (${Math.abs(businessExpenses.changePct).toFixed(1)}%)`,
      confidence,
    })
  }

  // --- Net Profit Decrease ---
  if (netProfit.direction === 'down') {
    const evidence: string[] = []
    if (productProfit.direction === 'down') {
      evidence.push(`Product profit decreased by ${Math.abs(productProfit.changePct).toFixed(1)}% ($${Math.abs(productProfit.change).toFixed(0)})`)
    }
    if (businessExpenses.direction === 'up') {
      evidence.push(`Business expenses increased by ${Math.abs(businessExpenses.changePct).toFixed(1)}% ($${Math.abs(businessExpenses.change).toFixed(0)})`)
    }
    if (evidence.length === 0) {
      evidence.push(`Net profit decreased from $${netProfit.previous.toFixed(0)} to $${netProfit.current.toFixed(0)}`)
    }

    const contributors: string[] = []
    if (productProfit.direction === 'down') contributors.push('product profit decrease')
    if (businessExpenses.direction === 'up') contributors.push('expense increase')
    const rootCause = contributors.length > 0
      ? `Net profit decreased by ${Math.abs(netProfit.changePct).toFixed(1)}% ($${Math.abs(netProfit.change).toFixed(0)}). Observed contributing factors: ${contributors.join(' and ')}. These are correlated observations and do not prove causation.`
      : 'Insufficient data to determine root cause.'

    findings.push({
      issue: `Net profit decreased by ${Math.abs(netProfit.changePct).toFixed(1)}% ($${Math.abs(netProfit.change).toFixed(0)})`,
      root_cause: rootCause,
      evidence,
      impact: `Net profit dropped from $${netProfit.previous.toFixed(0)} to $${netProfit.current.toFixed(0)}, a decrease of $${Math.abs(netProfit.change).toFixed(0)} (${Math.abs(netProfit.changePct).toFixed(1)}%)`,
      confidence: contributors.length > 1 ? 'high' : contributors.length === 1 ? 'medium' : 'low',
    })
  }

  return { findings }
}

function splitPeriods(txns: Transaction[], tf: Timeframe) {
  if (tf === 'all') {
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length < 2) return { current: sorted, previous: [] as Transaction[] }
    const firstDate = new Date(sorted[0].date).getTime()
    const lastDate = new Date(sorted[sorted.length - 1].date).getTime()
    const midTime = firstDate + (lastDate - firstDate) / 2
    return {
      current: sorted.filter((t) => new Date(t.date).getTime() >= midTime),
      previous: sorted.filter((t) => new Date(t.date).getTime() < midTime),
    }
  }
  const now = new Date()
  const start = startOfTimeframe(tf, now)!
  const startTime = start.getTime()
  const windowMs = now.getTime() - startTime
  const prevStart = startTime - windowMs
  return {
    current: txns.filter((t) => new Date(t.date).getTime() >= startTime),
    previous: txns.filter((t) => {
      const time = new Date(t.date).getTime()
      return time >= prevStart && time < startTime
    }),
  }
}

function analyzeChange(current: number, previous: number): ChangeAnalysis {
  const change = current - previous
  const changePct = previous !== 0 ? (change / Math.abs(previous)) * 100 : current !== 0 ? 100 : 0
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
  return { current, previous, change, changePct, direction }
}

function analyzeBreakdown(
  currentTxns: Transaction[],
  previousTxns: Transaction[],
  key: 'category' | 'channel',
): (CategoryChange | ChannelChange)[] {
  const currentBreakdown = buildBreakdown(currentTxns, key)
  const previousBreakdown = buildBreakdown(previousTxns, key)

  const prevMap = new Map(previousBreakdown.map((d) => [d.name, d]))
  const names = new Set<string>([...currentBreakdown.map((d) => d.name), ...previousBreakdown.map((d) => d.name)])

  const results: (CategoryChange | ChannelChange)[] = []
  for (const name of names) {
    const c = currentBreakdown.find((d) => d.name === name)
    const p = prevMap.get(name)
    const currentVal = c ? c.sales : 0
    const previousVal = p ? p.sales : 0
    const change = currentVal - previousVal
    const changePct = previousVal !== 0 ? (change / Math.abs(previousVal)) * 100 : currentVal !== 0 ? 100 : 0
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    results.push({
      name,
      current: currentVal,
      previous: previousVal,
      change,
      changePct,
      direction,
    })
  }

  return results.sort((a, b) => b.current - a.current)
}

function analyzeBuyingCostByCategory(
  currentTxns: Transaction[],
  previousTxns: Transaction[],
): CategoryChange[] {
  return analyzeCategoryField(currentTxns, previousTxns, 'sale', 'cost_price')
}

function analyzeBusinessExpensesByCategory(
  currentTxns: Transaction[],
  previousTxns: Transaction[],
): CategoryChange[] {
  return analyzeCategoryField(currentTxns, previousTxns, 'expense', 'amount')
}

function analyzeCategoryField(
  currentTxns: Transaction[],
  previousTxns: Transaction[],
  type: TransactionType,
  field: 'cost_price' | 'amount',
): CategoryChange[] {
  const currentMap = new Map<string, number>()
  for (const t of currentTxns) {
    if (t.type !== type) continue
    const cat = t.category
    const value = field === 'cost_price' ? t.cost_price || 0 : t.amount || 0
    currentMap.set(cat, (currentMap.get(cat) || 0) + value)
  }

  const previousMap = new Map<string, number>()
  for (const t of previousTxns) {
    if (t.type !== type) continue
    const cat = t.category
    const value = field === 'cost_price' ? t.cost_price || 0 : t.amount || 0
    previousMap.set(cat, (previousMap.get(cat) || 0) + value)
  }

  const names = new Set<string>([...currentMap.keys(), ...previousMap.keys()])
  const results: CategoryChange[] = []

  for (const name of names) {
    const currentVal = currentMap.get(name) || 0
    const previousVal = previousMap.get(name) || 0
    const change = currentVal - previousVal
    const changePct = previousVal !== 0 ? (change / Math.abs(previousVal)) * 100 : currentVal !== 0 ? 100 : 0
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    results.push({ name, current: currentVal, previous: previousVal, change, changePct, direction })
  }

  return results.sort((a, b) => b.current - a.current)
}
