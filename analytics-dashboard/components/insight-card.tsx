'use client'

import { Sparkles } from 'lucide-react'
import type { AiInsight } from '@/lib/types'

export function InsightCard({ insight }: { insight: AiInsight | null }) {
  if (!insight) return null
  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-semibold text-card-foreground">Executive summary</h3>
      </div>
      <p className="text-sm leading-relaxed text-card-foreground/90">{insight.summary}</p>
      {insight.anomalies ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Watch: </span>
          {insight.anomalies}
        </p>
      ) : null}
      {insight.actions ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-primary">Action: </span>
          {insight.actions}
        </p>
      ) : null}
    </div>
  )
}
