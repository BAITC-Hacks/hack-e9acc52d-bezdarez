import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../data/baseline'
import { PROJECTS } from '../data/projects'
import { SYNERGIES } from '../data/synergies'
import type { DraftDecisions } from '../types/simulation'
import {
  applyAssistantAction, buildAssistantContext, draftFingerprint,
  getLocalAssistantReply, validateAssistantAction,
} from './assistant'
import { allocatedTotal, calculateSimulation, toDecisions, validateDecisions } from './calculateSimulation'
import { emptyDraft } from './storage'
import { localizedMetric } from './i18n'

const fullDraft = (): DraftDecisions => ({
  transport: { projectId: 'adaptive-traffic-lights', allocatedBudget: 20 },
  greening: { projectId: 'smart-irrigation', allocatedBudget: 20 },
  social: { projectId: 'mobile-clinics', allocatedBudget: 20 },
  safety: { projectId: 'street-lighting', allocatedBudget: 20 },
  services: { projectId: 'digital-requests', allocatedBudget: 20 },
})

describe('assistant action boundary', () => {
  it.each([
    null, [], 'run', { type: 'delete' }, { type: 'goto', category: 'unknown' },
    { type: 'select', category: 'transport', projectId: 'street-lighting' },
    { type: 'select', category: 'transport', projectId: '__proto__' },
    { type: 'select', category: 'transport', projectId: 'unknown' },
    { type: 'budget', category: 'transport', amount: '20' },
    { type: 'budget', category: 'transport', amount: 20.5 },
    { type: 'budget', category: 'transport', amount: NaN },
    { type: 'budget', category: 'transport', amount: Infinity },
    { type: 'budget', category: 'transport', amount: 4 },
    { type: 'budget', category: 'transport', amount: 41 },
    { type: 'plan', decisions: [] },
  ])('rejects malformed actions: %j', (action) => {
    expect(validateAssistantAction(action)).toBeNull()
    const draft = fullDraft()
    expect(applyAssistantAction(draft, action)).toBe(draft)
  })

  it('requires a complete, unique, budget-valid plan before changing anything', () => {
    const decisions = toDecisions(fullDraft())
    const invalidPlans = [
      decisions.slice(0, 4),
      [...decisions.slice(0, 4), decisions[0]],
      decisions.map((d, i) => i === 0 ? { ...d, allocatedBudget: 21 } : d),
      decisions.map((d, i) => i === 0 ? { ...d, projectId: 'street-lighting' } : d),
    ]
    for (const plan of invalidPlans) expect(validateAssistantAction({ type: 'plan', decisions: plan })).toBeNull()
    expect(validateAssistantAction({ type: 'plan', decisions: [...decisions].reverse() })).toEqual({ type: 'plan', decisions })
    expect(applyAssistantAction(emptyDraft(), { type: 'plan', decisions })).toEqual(fullDraft())
  })

  it('selects without changing the budget, changes a budget without changing the project, and never mutates input', () => {
    const draft = fullDraft()
    const original = JSON.stringify(draft)
    const selected = applyAssistantAction(draft, { type: 'select', category: 'transport', projectId: 'bus-lanes' })
    expect(selected.transport).toEqual({ projectId: 'bus-lanes', allocatedBudget: 20 })
    const budgeted = applyAssistantAction(selected, { type: 'budget', category: 'transport', amount: 40 })
    expect(budgeted.transport).toEqual({ projectId: 'bus-lanes', allocatedBudget: 40 })
    expect(JSON.stringify(draft)).toBe(original)
    expect(selected.transport.allocatedBudget).toBe(20)
    expect(allocatedTotal(applyAssistantAction(budgeted, { type: 'balance' }))).toBe(100)
    expect(applyAssistantAction(draft, { type: 'run' })).toBe(draft)
    expect(applyAssistantAction(draft, { type: 'goto', category: 'social' })).toBe(draft)
  })
})

describe('assistant context', () => {
  it('sends all five budgets including those without a selected project', () => {
    const draft = emptyDraft()
    draft.social.allocatedBudget = 28
    const context = buildAssistantContext(draft, 'results')
    expect(context.budgets).toEqual({ transport: 20, greening: 20, social: 28, safety: 20, services: 20 })
    expect(context.allocated).toBe(108)
    expect(context.decisions).toEqual([])
    expect(context.incomplete).toBe(true)
    expect(context.screen).toBe('results')
    expect(context.catalog).toBe(PROJECTS)
    expect(context.synergies).toBe(SYNERGIES)
  })

  it('uses the simulation engine for both forecast horizons including penalties and synergies', () => {
    const draft = fullDraft()
    const result = calculateSimulation(toDecisions(draft))
    expect(buildAssistantContext(draft).forecast).toEqual({
      overallBefore: result.overallBefore, oneYear: result.oneYear, threeYears: result.threeYears,
    })
    expect(buildAssistantContext(draft).incomplete).toBe(false)
    draft.transport.allocatedBudget = 40
    expect(buildAssistantContext(draft).incomplete).toBe(true)
  })

  it('fingerprints depend on decisions and budgets, not insertion order', () => {
    const draft = fullDraft()
    const reversed = Object.fromEntries(Object.entries(draft).reverse()) as DraftDecisions
    expect(draftFingerprint(reversed)).toBe(draftFingerprint(draft))
    expect(draftFingerprint(applyAssistantAction(draft, { type: 'budget', category: 'social', amount: 22 }))).not.toBe(draftFingerprint(draft))
    expect(draftFingerprint(applyAssistantAction(draft, { type: 'select', category: 'transport', projectId: 'bus-lanes' }))).not.toBe(draftFingerprint(draft))
  })
})

describe('contextual local assistant', () => {
  it('provides a usable five-project plan only on request', () => {
    const reply = getLocalAssistantReply('Составь полный план для экологии', emptyDraft())
    const action = reply.actions[0].do
    expect(action.type).toBe('plan')
    expect(validateAssistantAction(action)).toEqual(action)
    const draft = applyAssistantAction(emptyDraft(), action)
    expect(toDecisions(draft)).toHaveLength(CATEGORIES.length)
    expect(validateDecisions(draft)).toEqual([])
    expect(reply.answer).toContain('без гарантии оптимальности')
    expect(getLocalAssistantReply('Составь полный план для экологии', emptyDraft())).toEqual(reply)
    expect(getLocalAssistantReply('Как улучшить экологию?', emptyDraft()).actions.every((a) => a.do.type === 'select')).toBe(true)
  })

  it('remembers the previous user topic for a follow-up, and switches to an explicit new topic', () => {
    const first = getLocalAssistantReply('Как снизить пробки?', emptyDraft())
    const history = [{ role: 'user' as const, content: 'Как снизить пробки?' }, { role: 'assistant' as const, content: first.answer }]
    const followup = getLocalAssistantReply('А какие ещё варианты?', emptyDraft(), history)
    expect(followup.answer).toContain('Мобильность')
    expect(followup.actions.length).toBeGreaterThan(0)
    const previouslySuggested = first.actions.flatMap((a) => a.do.type === 'select' ? [a.do.projectId] : [])
    expect(followup.actions.every((a) => a.do.type === 'select' && !previouslySuggested.includes(a.do.projectId))).toBe(true)
    expect(getLocalAssistantReply('А что с экологией?', emptyDraft(), history).answer).toContain('Экология')
    expect(getLocalAssistantReply('А через 3 года?', fullDraft(), history).answer).toContain('Мобильность: сейчас 54')
    expect(getLocalAssistantReply('Какая столица Франции?', emptyDraft(), []).answer).toContain('Для свободного диалога')
  })

  it('compares named projects at equal budgets and returns valid selection actions', () => {
    const reply = getLocalAssistantReply('Сравни ЛРТ и автобусные полосы', fullDraft())
    expect(reply.answer).toContain('одинаковом бюджете 20')
    expect(reply.answer).toContain('Продление линии ЛРТ')
    expect(reply.answer).toContain('Выделенные автобусные полосы')
    expect(reply.actions).toHaveLength(2)
    for (const action of reply.actions) expect(validateAssistantAction(action.do)).toEqual(action.do)
  })

  it('diagnoses the actual allocation and marks incomplete forecasts', () => {
    const draft = emptyDraft()
    draft.transport.allocatedBudget = 35
    const budgetReply = getLocalAssistantReply('Проверь бюджет', draft)
    expect(budgetReply.answer).toContain('115/100')
    expect(budgetReply.answer).toContain('Превышение бюджета — 15')
    expect(budgetReply.actions.some((a) => a.do.type === 'balance')).toBe(true)
    expect(getLocalAssistantReply('Какой прогноз через 3 года?', draft).answer).toContain('Частичный предварительный расчёт')
    expect(getLocalAssistantReply('Проверь мой план', fullDraft()).actions.some((a) => a.do.type === 'run')).toBe(true)
    expect(getLocalAssistantReply('Сбалансируй бюджет', fullDraft()).actions.some((a) => a.do.type === 'balance')).toBe(true)
  })

  it('can propose an explicit budget and converts model currency without silently applying it', () => {
    const draft = fullDraft()
    const reply = getLocalAssistantReply('Выдели транспорту 60 млрд', draft)
    expect(reply.actions[0].do).toEqual({ type: 'budget', category: 'transport', amount: 30 })
    expect(reply.answer).toContain('110/100')
    expect(draft.transport.allocatedBudget).toBe(20)
    expect(getLocalAssistantReply('Выдели транспорту 80 единиц', draft).actions).toEqual([])
  })

  it('supports Kazakh questions and never produces unvalidated or excessive actions', () => {
    const questions = ['Бюджетті тексер', 'Кептелісті қалай азайтамын?', 'Жоспар жаса', '3 жылдан кейінгі нәтиже', 'Сәлем']
    for (const question of questions) {
      const reply = getLocalAssistantReply(question, emptyDraft(), [], 'kk')
      expect(reply.answer.length).toBeGreaterThan(20)
      expect(reply.actions.length).toBeLessThanOrEqual(3)
      for (const action of reply.actions) expect(validateAssistantAction(action.do)).toEqual(action.do)
    }
    expect(getLocalAssistantReply('Жоспар жаса', emptyDraft(), [], 'kk').actions[0].do.type).toBe('plan')
    expect(getLocalAssistantReply('Кептелісті қалай азайтамын?', emptyDraft(), [], 'kk').answer).toContain(localizedMetric('mobility', 'kk'))
  })
})
