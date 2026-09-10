'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Ready ah mame, inaiku sales ena?',
  'Profit margin evlo?',
  'Worst performing region edhu?',
  'Which category performs best?',
]

// Minimal typing for the browser's non-standard SpeechRecognition APIs.
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
}

export function CopilotView({ buildContext }: { buildContext: () => unknown }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [engine, setEngine] = useState<'ai' | 'local' | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [lang, setLang] = useState<'ta-IN' | 'en-IN'>('ta-IN')
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const Ctor =
      (typeof window !== 'undefined' &&
        ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) ||
      null
    if (Ctor) setVoiceSupported(true)
    return () => recognitionRef.current?.stop()
  }, [])

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

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Ctor =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!Ctor) return
    const recognition: SpeechRecognitionLike = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true

    let finalText = ''
    recognition.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += chunk
        else interim += chunk
      }
      setInput(finalText || interim)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => {
      setListening(false)
      // Auto-submit whatever was transcribed.
      const text = finalText.trim()
      if (text) ask(text)
    }

    recognitionRef.current = recognition
    setInput('')
    setListening(true)
    recognition.start()
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
          <p className="text-xs text-muted-foreground">English, Tamil illa Tanglish la kelunga</p>
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

      <div className="sticky bottom-0 space-y-2 pt-2">
        {voiceSupported ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Voice:</span>
            {(['ta-IN', 'en-IN'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  lang === code
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border/60 bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {code === 'ta-IN' ? 'தமிழ்' : 'English'}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={listening ? 'Listening…' : 'Ask a question…'}
            className="flex-1 rounded-full border border-input bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          {voiceSupported ? (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={listening ? 'Stop listening' : 'Speak your question'}
              aria-pressed={listening}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors',
                listening
                  ? 'animate-pulse border-transparent bg-destructive text-background'
                  : 'border-border/60 bg-card text-foreground hover:border-primary/40',
              )}
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
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
    </div>
  )
}
