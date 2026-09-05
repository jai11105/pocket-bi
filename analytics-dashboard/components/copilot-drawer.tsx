'use client'

import { useRef, useState } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Which region has the lowest profit margin?',
  'What is my best performing category?',
  'Summarize this week vs last week.',
  'Where should I cut costs?',
]

export function CopilotView({ buildContext }: { buildContext: () => unknown }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [engine, setEngine] = useState<'ai' | 'local' | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function ask(question: string) {
    if (!question.trim() || loading) return
    const next: Message[] = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setInput('')
    setLoading(true)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }))
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: buildContext() }),
      })
      const json = await res.json()
      if (json.engine) setEngine(json.engine)
      setMessages([
        ...next,
        { role: 'assistant', content: json.answer ?? json.error ?? 'No response.' },
      ])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }))
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      ask(input)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">AI Copilot</h1>
          <p className="text-xs text-muted-foreground">Ask about your metrics in plain English</p>
        </div>
      </header>

      {engine === 'local' ? (
        <p className="mb-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Answers use the built-in analytics engine. Add a billing card to your Vercel AI Gateway to
          unlock full natural-language responses.
        </p>
      ) : null}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-left text-sm text-card-foreground transition-colors hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm border border-border/60 bg-card text-card-foreground',
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border/60 bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Analyzing…
            </div>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question…"
          className="flex-1 rounded-full border border-input bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="button"
          onClick={() => ask(input)}
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
