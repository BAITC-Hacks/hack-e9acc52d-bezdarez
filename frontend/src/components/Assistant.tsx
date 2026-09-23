import { Bot, Check, GraduationCap, Lightbulb, RotateCcw, Send, Sparkles, Square, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '../data/baseline'
import { PROJECTS_BY_ID } from '../data/projects'
import { adviseDraft, type AdvisorAction, type Tip } from '../lib/advisor'
import { applyAssistantAction, buildAssistantContext, draftFingerprint } from '../lib/assistant'
import { ASSISTANT_TIMEOUT_MS, chatHistory, loadChat, MAX_MESSAGES, MAX_QUESTION, parseAiReply, saveChat, type ChatAction, type ChatMessage } from '../lib/assistantChat'
import { allocatedTotal, calculateSimulation, toDecisions, validateDecisions } from '../lib/calculateSimulation'
import { fmt } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { localizeProject } from '../lib/localizedContent'
import type { DraftDecisions } from '../types/simulation'
import { AssistantMessage } from './AssistantMessage'

const COPY = {
  ru: {
    welcome: 'Привет! Задайте свой вопрос: помогу разобраться в теме, решить задачу, написать текст или код. А ещё могу обсудить ваши решения в симуляторе. Учитываю предыдущие сообщения в диалоге.',
    quick: ['Объясни, как работает интернет', 'Реши уравнение: 3x + 7 = 22', 'Помоги написать письмо', 'Оцени мои решения в симуляторе'],
    clear: 'Новый диалог', close: 'Закрыть помощника', tips: 'Подсказки по вашим решениям',
    local: 'AI недоступен', configured: 'Модель настроена', connected: 'На связи', checking: 'Проверяю подключение…',
    rules: 'По данным симулятора', retry: 'Повторить запрос', stop: 'Остановить ответ',
    unavailable: 'Не удалось связаться с AI. Попробуйте отправить вопрос ещё раз. Подсказки по симулятору доступны в отдельном разделе выше.',
    timeout: 'Модель не успела ответить. Первый запуск может занять больше времени. Повторите запрос через несколько секунд.',
    stopped: 'Запрос остановлен.', stale: 'Решения изменились — запросите новый совет.', applied: 'Применено',
    appliedText: 'Применено: ', preview: 'Изменения после применения', partial: 'Предварительный AQLS',
    budget: 'Бюджет', selected: 'Выбрано проектов', saved: 'История сохраняется в этом браузере',
    placeholder: 'Задайте любой вопрос…', composing: 'Enter — отправить · Shift+Enter — новая строка',
    thinking: 'Готовлю ответ… Первый запрос может занять чуть больше времени.',
    invalidRun: 'Сначала выберите пять проектов и распределите ровно 100 ед.',
  },
  kk: {
    welcome: 'Сәлем! Өз сұрағыңызды қойыңыз: тақырыпты түсінуге, есеп шығаруға, мәтін немесе код жазуға көмектесемін. Симулятордағы шешімдеріңізді де талқылай аламыз. Әңгімедегі алдыңғы хабарларды ескеремін.',
    quick: ['Интернет қалай жұмыс істейді?', 'Теңдеуді шеш: 3x + 7 = 22', 'Хат жазуға көмектес', 'Симулятордағы шешімдерімді бағала'],
    clear: 'Жаңа әңгіме', close: 'Көмекшіні жабу', tips: 'Шешімдеріңіз бойынша кеңестер',
    local: 'AI қолжетімсіз', configured: 'Модель бапталған', connected: 'Байланыста', checking: 'Байланыс тексерілуде…',
    rules: 'Симулятор деректері бойынша', retry: 'Қайталап сұрау', stop: 'Жауапты тоқтату',
    unavailable: 'AI-мен байланысу мүмкін болмады. Сұрақты қайта жіберіп көріңіз. Симулятор кеңестері жоғарыдағы жеке бөлімде қолжетімді.',
    timeout: 'Модель жауап беріп үлгермеді. Алғашқы іске қосылу ұзағырақ болуы мүмкін. Бірнеше секундтан кейін қайталап көріңіз.',
    stopped: 'Сұрау тоқтатылды.', stale: 'Шешімдер өзгерді — жаңа кеңес сұраңыз.', applied: 'Қолданылды',
    appliedText: 'Қолданылды: ', preview: 'Қолданғаннан кейінгі өзгерістер', partial: 'Алдын ала AQLS',
    budget: 'Бюджет', selected: 'Таңдалған жобалар', saved: 'Тарих осы браузерде сақталады',
    placeholder: 'Кез келген сұрақты қойыңыз…', composing: 'Enter — жіберу · Shift+Enter — жаңа жол',
    thinking: 'Жауап дайындап жатырмын… Алғашқы сұрау сәл ұзағырақ болуы мүмкін.',
    invalidRun: 'Алдымен бес жобаны таңдап, дәл 100 бірлікті бөліңіз.',
  },
  en: {
    welcome: 'Hi! Ask me a question: I can explain a topic, solve a problem, or help you write text or code. We can also discuss your choices in the simulator. I take earlier messages in this conversation into account.',
    quick: ['Explain how the internet works', 'Solve the equation: 3x + 7 = 22', 'Help me write an email', 'Review my choices in the simulator'],
    clear: 'New conversation', close: 'Close assistant', tips: 'Tips for your current choices',
    local: 'AI unavailable', configured: 'Model configured', connected: 'Connected', checking: 'Checking connection…',
    rules: 'Based on simulator data', retry: 'Try again', stop: 'Stop response',
    unavailable: 'Could not connect to the AI. Try sending your question again. Simulator tips are available in the section above.',
    timeout: 'The model did not respond in time. The first request can take longer. Try again in a few seconds.',
    stopped: 'Request stopped.', stale: 'Your choices have changed. Ask for fresh advice.', applied: 'Applied',
    appliedText: 'Applied: ', preview: 'Changes after applying', partial: 'Preliminary AQLS',
    budget: 'Budget', selected: 'Projects selected', saved: 'Conversation saved in this browser',
    placeholder: 'Ask any question…', composing: 'Enter to send · Shift+Enter for a new line',
    thinking: 'Preparing a response… The first request may take a little longer.',
    invalidRun: 'Choose five projects and allocate exactly 100 units first.',
  },
}

type Pending = { controller: AbortController; stopped: boolean }
type Connection = { configured: boolean; available?: boolean; model?: string } | null

export function Assistant({ draft, screen = 'simulator', onAction, onStartTour }: {
  draft: DraftDecisions
  screen?: 'start' | 'simulator' | 'result'
  onAction: (action: AdvisorAction) => boolean
  onStartTour: () => void
}) {
  const { t, lang } = useI18n()
  const copy = COPY[lang]
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<ChatMessage[]>(loadChat)
  const [connection, setConnection] = useState<Connection>(null)
  const pending = useRef<Pending | null>(null)
  const messages = useRef(msgs)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const tips = adviseDraft(draft, lang)
  const fingerprint = draftFingerprint(draft)

  const updateMessages = (next: ChatMessage[]) => {
    messages.current = next.slice(-MAX_MESSAGES)
    setMsgs(messages.current)
    saveChat(messages.current)
  }
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs, open, busy])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => {
    return () => { pending.current?.controller.abort(); pending.current = null }
  }, [])
  useEffect(() => {
    if (!open) return
    let active = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => { controller.abort(); if (active) setConnection({ configured: false }) }, 5000)
    fetch('/api/health', { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((body) => { if (active) setConnection({ configured: body?.llm?.configured === true, available: typeof body?.llm?.available === 'boolean' ? body.llm.available : undefined, model: typeof body?.llm?.model === 'string' ? body.llm.model : undefined }) })
      .catch(() => { if (active) setConnection({ configured: false }) })
      .finally(() => window.clearTimeout(timer))
    return () => { active = false; window.clearTimeout(timer); controller.abort() }
  }, [open])

  const ask = async (question: string, retry = false) => {
    const q = question.trim().slice(0, MAX_QUESTION)
    if (!q || pending.current) return
    let base = messages.current
    if (retry) {
      const index = base.findLastIndex((message) => message.role === 'user')
      if (index < 0) return
      base = base.slice(0, index)
    }
    const history = chatHistory(base)
    const request: Pending = { controller: new AbortController(), stopped: false }
    pending.current = request
    setBusy(true)
    setInput('')
    updateMessages([...base, { id: crypto.randomUUID(), role: 'user', text: q }])
    let timedOut = false
    const timer = window.setTimeout(() => { timedOut = true; request.controller.abort() }, ASSISTANT_TIMEOUT_MS)
    let reply: ChatMessage = {
      id: crypto.randomUUID(), role: 'assistant', text: copy.unavailable,
      actions: [], source: 'status', contextKey: fingerprint, retryable: true, notice: 'unavailable',
    }
    try {
      const response = await fetch('/api/assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: request.controller.signal,
        body: JSON.stringify({ question: q, history, lang, context: buildAssistantContext(draft, screen, lang) }),
      })
      const result = response.ok ? parseAiReply(await response.json()) : null
      if (result) {
        reply = { ...reply, text: result.answer, actions: result.actions, source: 'ai', model: result.model, retryable: false, notice: undefined }
        if (pending.current === request) setConnection({ configured: true, available: true, model: result.model })
      }
    } catch { if (timedOut) reply = { ...reply, text: copy.timeout, notice: 'timeout' } }
    finally {
      window.clearTimeout(timer)
      // Ignore late responses after clearing the conversation or unmounting.
      if (pending.current === request) {
        if (request.stopped) reply = { ...reply, text: copy.stopped, actions: [], notice: 'stopped', source: 'status', model: undefined, retryable: true }
        else if (reply.source === 'status') setConnection((current) => ({ configured: current?.configured ?? false, available: false, model: current?.model }))
        updateMessages([...messages.current, reply])
        pending.current = null
        setBusy(false)
        inputRef.current?.focus()
      }
    }
  }
  const clear = () => {
    pending.current?.controller.abort()
    pending.current = null
    setBusy(false)
    updateMessages([])
    setInput('')
    inputRef.current?.focus()
  }
  const close = () => { setOpen(false); toggleRef.current?.focus() }
  const apply = (action: ChatAction, message: ChatMessage) => {
    if (busy || message.applied || message.contextKey !== draftFingerprint(draft) || !onAction(action.do)) return
    updateMessages([
      ...messages.current.map((item) => item.id === message.id ? { ...item, applied: true } : item),
      { id: crypto.randomUUID(), role: 'assistant', text: copy.appliedText + action.label, source: 'rules' },
    ])
  }
  const lastUser = msgs.findLast((message) => message.role === 'user')

  return <>
    <button ref={toggleRef} onClick={() => setOpen((value) => !value)} data-tour="assistant"
      aria-expanded={open} aria-controls="assistant-panel" aria-label={t('assistant.title')}
      className="fixed bottom-4 right-4 z-40 grid size-16 place-items-center rounded-full bg-linear-to-br from-mint to-accent text-white shadow-[0_12px_30px_-8px_rgba(0,184,111,0.7)] ring-4 ring-surface transition hover:scale-105 sm:bottom-6 sm:right-6">
      {open ? <X aria-hidden className="size-7" /> : <Bot aria-hidden className="size-8" />}
      {!open && tips.some((tip) => tip.tone !== 'info') && <span className="absolute right-0.5 top-0.5 size-4 rounded-full border-2 border-surface bg-serious" aria-hidden />}
    </button>
    {open && <section id="assistant-panel" role="dialog" aria-label={t('assistant.title')}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}
      className="rise fixed bottom-24 right-3 z-40 flex max-h-[min(740px,calc(100dvh-8rem))] w-[min(460px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl sm:bottom-28 sm:right-6">
      <header className="flex items-center gap-2 bg-linear-to-r from-accent to-[#0f5a64] px-4 py-3.5 text-white">
        <Sparkles aria-hidden className="size-6 shrink-0" />
        <div className="min-w-0 flex-1"><h2 className="font-extrabold leading-tight">{t('assistant.title')}</h2>
          <p className="truncate text-xs text-white/80" title={connection?.model}>{connection === null ? copy.checking : connection.available === true ? copy.connected : connection.available === false || !connection.configured ? copy.local : copy.configured}</p>
        </div>
        <button onClick={onStartTour} aria-label={t('assistant.tour')} title={t('assistant.tour')} className="rounded-xl p-2 hover:bg-white/20"><GraduationCap aria-hidden className="size-5" /></button>
        <button onClick={clear} aria-label={copy.clear} title={copy.clear} className="rounded-xl p-2 hover:bg-white/20"><Trash2 aria-hidden className="size-4" /></button>
        <button onClick={close} aria-label={copy.close} className="rounded-xl p-2 hover:bg-white/20"><X aria-hidden className="size-5" /></button>
      </header>
      <div className="border-b border-line bg-surface-2 px-4 py-2 text-xs text-muted">{copy.selected}: {toDecisions(draft).length}/5 · {copy.budget}: {allocatedTotal(draft)}/100</div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        {!msgs.length && <p className="rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">{copy.welcome}</p>}
        <details className="rounded-2xl border border-line p-3 text-sm"><summary className="cursor-pointer font-semibold text-ink-2">{copy.tips} · {tips.length}</summary>
          <div className="mt-3 space-y-2">{tips.map((tip) => <TipCard key={tip.id} tip={tip} disabled={busy} onAction={onAction} />)}</div>
        </details>
        <div role="log" aria-label={t('assistant.title')} aria-live="polite" aria-relevant="additions text" className="space-y-3">
          {msgs.map((message, index) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`min-w-0 max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-accent text-white' : 'rounded-bl-md bg-surface-2'}`}>
              {message.notice && message.notice !== 'stopped' && message.source !== 'status' && <p className="mb-2 text-xs text-muted">{copy[message.notice]}</p>}
              {message.role === 'assistant' ? <AssistantMessage text={message.text} /> : <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p>}
              {!!message.actions?.length && <div className="mt-3 space-y-2">
                {message.actions.map((action, actionIndex) => <div key={actionIndex} className="rounded-xl border border-line bg-surface p-2.5">
                  {!message.applied && message.contextKey === fingerprint && <ActionPreview action={action.do} draft={draft} />}
                  <button disabled={busy || message.applied || message.contextKey !== fingerprint || (action.do.type === 'run' && validateDecisions(draft).length > 0)} onClick={() => apply(action, message)} className="mt-2 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
                    {message.applied ? <span className="flex items-center gap-1"><Check aria-hidden className="size-3" />{copy.applied}</span> : `${action.label} →`}
                  </button>
                  {action.do.type === 'run' && validateDecisions(draft).length > 0 && <p className="mt-1 text-xs text-muted">{copy.invalidRun}</p>}
                </div>)}
                {!message.applied && message.contextKey !== fingerprint && <p className="text-xs text-muted">{copy.stale}</p>}
              </div>}
              {message.source && message.source !== 'status' && <span className="mt-2 block text-[10px] font-semibold text-muted">{message.source === 'ai' ? 'AI' : copy.rules}</span>}
              {message.retryable && index === msgs.length - 1 && lastUser && <button disabled={busy} onClick={() => void ask(lastUser.text, true)} className="mt-2 flex items-center gap-1 text-xs font-bold text-good-ink disabled:opacity-40"><RotateCcw aria-hidden className="size-3" />{copy.retry}</button>}
            </div>
          </div>)}
        </div>
        {busy && <p role="status" className="flex items-center gap-2 text-xs text-muted"><span className="size-2 shrink-0 animate-pulse rounded-full bg-accent" />{copy.thinking}</p>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{copy.quick.map((question) => <button key={question} disabled={busy} onClick={() => void ask(question)} className="pill shrink-0 bg-surface-2 text-ink-2 hover:bg-lavender disabled:opacity-40">{question}</button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); void ask(input) }} className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} maxLength={MAX_QUESTION} rows={2} onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(input) } }}
            placeholder={copy.placeholder} aria-label={copy.placeholder} title={copy.composing} className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent" />
          {busy ? <button type="button" onClick={() => { if (pending.current) { pending.current.stopped = true; pending.current.controller.abort() } }} aria-label={copy.stop} title={copy.stop} className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-white"><Square aria-hidden className="size-4" /></button>
            : <button type="submit" disabled={!input.trim()} aria-label={t('assistant.ask')} className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-white disabled:opacity-40"><Send aria-hidden className="size-4" /></button>}
        </form>
        <div className="mt-1.5 flex justify-between gap-2 text-[10px] text-muted"><span>{copy.saved}</span><span>{input.length}/{MAX_QUESTION}</span></div>
      </div>
    </section>}
  </>
}

function ActionPreview({ action, draft }: { action: AdvisorAction; draft: DraftDecisions }) {
  const { lang, category } = useI18n()
  const copy = COPY[lang]
  if (action.type === 'goto' || action.type === 'run') return null
  const next = applyAssistantAction(draft, action)
  const changed = CATEGORIES.filter((key) => next[key].projectId !== draft[key].projectId || next[key].allocatedBudget !== draft[key].allocatedBudget)
  const result = calculateSimulation(toDecisions(next))
  return <div className="text-xs"><p className="mb-1 font-semibold">{copy.preview}</p>
    {changed.map((key) => <p key={key} className="mb-1">{category(key)}: {next[key].projectId ? localizeProject(PROJECTS_BY_ID[next[key].projectId!], lang).title : '—'} · {draft[key].allocatedBudget} → {next[key].allocatedBudget}</p>)}
    <p className="text-muted">{validateDecisions(next).length ? copy.partial : 'AQLS'}: {fmt(result.overallAfterOneYear, lang)} / {fmt(result.overallAfterThreeYears, lang)} ({lang === 'kk' ? '1 / 3 жыл' : lang === 'en' ? '1 / 3 years' : '1 / 3 года'}) · {copy.budget}: {allocatedTotal(next)}/100</p>
  </div>
}

function TipCard({ tip, onAction, disabled }: { tip: Tip; onAction: (action: AdvisorAction) => boolean; disabled: boolean }) {
  const tone = { info: 'border-line bg-surface-2', warn: 'border-warn/30 bg-warn/10', good: 'border-accent/30 bg-accent-track' }[tip.tone]
  return <div className={`rounded-2xl border p-3 text-sm ${tone}`}>
    <p className="flex gap-2"><Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" /><span>{tip.text}</span></p>
    {tip.action && <button disabled={disabled} onClick={() => onAction(tip.action!.do)} className="ml-6 mt-2 rounded-lg bg-surface px-3 py-1.5 text-xs font-bold text-good-ink shadow-sm hover:bg-accent hover:text-white disabled:opacity-40">{tip.action.label} →</button>}
  </div>
}
