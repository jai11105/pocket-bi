import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { localCopilotAnswer } from '@/lib/local-copilot'

export const maxDuration = 30

export async function POST(request: Request) {
  const { question, context } = await request.json()

  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'A question is required.' }, { status: 400 })
  }

  try {
    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      system:
        'You are the analytics copilot inside a mobile Power BI style app. ' +
        'You are given a JSON snapshot of the current dashboard: aggregate metrics, ' +
        'per-category and per-region breakdowns, and recent trend percentages. ' +
        'Answer the user question using ONLY the data provided. Be concise and mobile-friendly: ' +
        'lead with a one-sentence answer, then 2-4 short bullet points (use "- "), and finish with a ' +
        'single "Recommended action:" line. Format currency with $ and use % for margins. ' +
        'If the data cannot answer the question, say so briefly.',
      prompt: `DASHBOARD SNAPSHOT:\n${JSON.stringify(context, null, 2)}\n\nQUESTION: ${question}`,
    })

    return NextResponse.json({ answer: text, engine: 'ai' })
  } catch (err) {
    // AI Gateway may be unavailable (e.g. no billing card on file). Fall back to
    // a local rule-based analytics engine so the copilot keeps working live.
    console.log('[v0] AI Gateway unavailable, using local copilot fallback:', String(err))
    try {
      const answer = localCopilotAnswer(question, context)
      return NextResponse.json({ answer, engine: 'local' })
    } catch (fallbackErr) {
      console.log('[v0] Local copilot failed:', String(fallbackErr))
      return NextResponse.json(
        { error: 'The copilot is unavailable right now. Please try again.' },
        { status: 500 },
      )
    }
  }
}
