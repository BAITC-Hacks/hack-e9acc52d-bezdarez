import { Bot, GraduationCap, Lightbulb, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { adviseDraft, answerLocally, type AdvisorAction, type Tip } from '../lib/advisor'
import { allocatedTotal, toDecisions } from '../lib/calculateSimulation'
import { useI18n } from '../lib/i18n'
import type { DraftDecisions } from '../types/simulation'

type Msg = { role: 'user' | 'bot'; text: string; source?: 'ai' | 'rules' }

const QUICK = ['Как снизить пробки?', 'Что поднимет экологию?', 'Как считаются штрафы?', 'Чем 3 года отличаются от 1?']

/** Плавающий AI-помощник: контекстные советы с действиями + вопросы (LLM или правила). */
export function Assistant({
  draft,
  onAction,
  onStartTour,
}: {
  draft: DraftDecisions
  onAction: (a: AdvisorAction) => void
  onStartTour: () => void
}) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const tips = adviseDraft(draft)
  const endRef = useRef<HTMLDivElement>(null)
  // Блочное тело обязательно: scrollIntoView в новых браузерах возвращает Promise, а React ждёт функцию очистки.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [msgs, open])

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    let reply: Msg = { role: 'bot', text: answerLocally(q), source: 'rules' }
    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lang, context: { decisions: toDecisions(draft), allocated: allocatedTotal(draft) } }),
      })
      const body = await res.json()
      if (body?.success && typeof body.answer === 'string') reply = { role: 'bot', text: body.answer, source: 'ai' }
    } catch {
      /* сеть недоступна — ответ по правилам уже готов */
    }
    setMsgs((m) => [...m, reply])
    setBusy(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        data-tour="assistant"
        aria-expanded={open}
        aria-label={t('assistant.title')}
        className="fixed bottom-4 right-4 z-40 grid size-16 place-items-center rounded-full bg-linear-to-br from-mint to-accent text-white shadow-[0_12px_30px_-8px_rgba(0,184,111,0.7)] ring-4 ring-surface transition hover:scale-105 sm:bottom-6 sm:right-6"
      >
        {open ? <X aria-hidden className="size-7" /> : <Bot aria-hidden className="size-8" />}
        {!open && tips.some((x) => x.tone !== 'info') && (
          <span className="absolute right-0.5 top-0.5 size-4 rounded-full border-2 border-surface bg-serious" aria-hidden />
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label={t('assistant.title')}
          className="rise fixed bottom-24 right-3 z-40 flex max-h-[min(640px,calc(100vh-8rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl sm:bottom-28 sm:right-6"
        >
          <header className="flex items-center gap-3 bg-linear-to-r from-accent to-[#0f5a64] px-4 py-3.5 text-white">
            <span className="grid size-10 place-items-center rounded-2xl bg-white/20">
              <Sparkles aria-hidden className="size-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-extrabold leading-tight">{t('assistant.title')}</h2>
              <p className="text-xs text-white/80">{t('assistant.subtitle')}</p>
            </div>
            <button onClick={onStartTour} className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1.5 text-xs font-bold hover:bg-white/25">
              <GraduationCap aria-hidden className="size-4" /> {t('nav.tour')}
            </button>
          </header>

          <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
            {tips.map((tip) => (
              <TipCard key={tip.id} tip={tip} onAction={onAction} />
            ))}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'rounded-br-md bg-accent text-white' : 'rounded-bl-md bg-surface-2'
                  }`}
                >
                  {m.text}
                  {m.source && (
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {m.source === 'ai' ? 'AI · NVIDIA' : 'по данным модели'}
                    </span>
                  )}
                </p>
              </div>
            ))}
            {busy && <p className="text-xs text-muted">{t('assistant.thinking')}</p>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {QUICK.map((q) => (
                <button key={q} onClick={() => ask(q)} className="pill shrink-0 bg-surface-2 text-ink-2 hover:bg-lavender">
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 300))}
                placeholder={t('assistant.placeholder')}
                aria-label={t('assistant.placeholder')}
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label={t('assistant.ask')} className="grid size-11 place-items-center rounded-xl bg-accent text-white disabled:opacity-40">
                <Send aria-hidden className="size-4" />
              </button>
            </form>
          </div>
        </section>
      )}
    </>
  )
}

function TipCard({ tip, onAction }: { tip: Tip; onAction: (a: AdvisorAction) => void }) {
  const tone = { info: 'border-line bg-surface-2', warn: 'border-warn/30 bg-warn/10', good: 'border-accent/30 bg-accent-track' }[tip.tone]
  return (
    <div className={`rounded-2xl border p-3 text-sm ${tone}`}>
      <p className="flex gap-2">
        <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>{tip.text}</span>
      </p>
      {tip.action && (
        <button onClick={() => onAction(tip.action!.do)} className="ml-6 mt-2 rounded-lg bg-surface px-3 py-1.5 text-xs font-bold text-good-ink shadow-sm hover:bg-accent hover:text-white">
          {tip.action.label} →
        </button>
      )}
    </div>
  )
}
