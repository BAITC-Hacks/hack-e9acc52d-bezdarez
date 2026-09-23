import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATEGORIES } from '../data/baseline'
import { PROJECTS, PROJECTS_BY_ID } from '../data/projects'
import { aiExplanationSchema } from '../types/ai'
import type { DraftDecisions } from '../types/simulation'
import { adviseDraft } from './advisor'
import { buildAssistantContext, getLocalAssistantReply, validateAssistantAction } from './assistant'
import { chatHistory, type ChatMessage } from './assistantChat'
import { buildAiPayload } from './buildAiPayload'
import { calculateSimulation, toDecisions } from './calculateSimulation'
import { explanationFailureMessage, requestExplanation } from './explainApi'
import { generateFallbackExplanation } from './generateFallbackExplanation'
import { localizedMetric } from './i18n'
import { emptyDraft } from './storage'

const draft: DraftDecisions = {
  transport: { projectId: 'lrt-extension', allocatedBudget: 35 },
  greening: { projectId: 'tree-planting', allocatedBudget: 5 },
  social: { projectId: 'school-expansion', allocatedBudget: 20 },
  safety: { projectId: 'emergency-center', allocatedBudget: 20 },
  services: { projectId: 'digital-requests', allocatedBudget: 20 },
}
const result = calculateSimulation(toDecisions(draft))
const cyrillic = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/
const kazakh = /[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/

afterEach(() => vi.unstubAllGlobals())

describe('localized assistant evidence', () => {
  it.each(['kk', 'en'] as const)('localizes %s catalog and forecasts while preserving every identifier and calculation', (lang) => {
    const context = buildAssistantContext(draft, 'result', lang)
    expect(context.decisions).toEqual(toDecisions(draft))
    expect(context.catalog.map((p) => [p.id, p.category, p.effects, p.recommendedBudget])).toEqual(PROJECTS.map((p) => [p.id, p.category, p.effects, p.recommendedBudget]))
    expect(context.forecast.oneYear.scores).toEqual(result.oneYear.scores)
    expect(context.forecast.threeYears.penaltyTotal).toEqual(result.threeYears.penaltyTotal)
    expect(context.forecast.oneYear.penalties.map((p) => [p.kind, p.category, p.points])).toEqual(result.oneYear.penalties.map((p) => [p.kind, p.category, p.points]))
    const catalogText = context.catalog.map((p) => [p.title, p.shortDescription, p.fullDescription, ...p.risks, ...p.benefits].join(' ')).join(' ')
    for (const project of PROJECTS) expect(catalogText).not.toContain(project.title)
    if (lang === 'en') expect(catalogText).not.toMatch(cyrillic)
    else expect(catalogText).toMatch(kazakh)
  })

  it.each(['kk', 'en'] as const)('sends localized %s explanations without changing project values', (lang) => {
    const payload = buildAiPayload(result, '3y', lang)
    expect(payload.overallAfter).toBe(result.overallAfterThreeYears)
    expect(payload.selectedProjects.map((p) => [p.category, p.allocatedBudget, p.recommendedBudget])).toEqual(result.contributions.map((c) => [c.category, c.allocatedBudget, PROJECTS_BY_ID[c.projectId].recommendedBudget]))
    expect(payload.selectedProjects[0].title).not.toBe(result.contributions[0].title)
    expect(payload.penalties).not.toEqual(result.threeYears.penalties.map((p) => p.description))
    if (lang === 'en') expect(JSON.stringify(payload)).not.toMatch(cyrillic)
  })

  it('keeps original conversation text when the interface language changes', () => {
    const messages: ChatMessage[] = [
      { id: 'ru', role: 'user', text: 'Меня зовут Алина.' },
      { id: 'kk', role: 'assistant', text: 'Танысқаныма қуаныштымын, Алина!', source: 'ai' },
      { id: 'en', role: 'user', text: 'What is my name?' },
    ]
    expect(chatHistory(messages)).toEqual(messages.map((m) => ({ role: m.role, content: m.text })))
    expect(messages[0].text).toBe('Меня зовут Алина.')
  })
})

describe('localized offline output', () => {
  it.each(['kk', 'en'] as const)('renders %s fallback, risks, personas and advice without Russian catalog titles', (lang) => {
    for (const horizon of ['1y', '3y'] as const) {
      const fallback = generateFallbackExplanation(result, horizon, lang)
      expect(aiExplanationSchema.safeParse(fallback).success).toBe(true)
      const text = JSON.stringify(fallback)
      for (const project of result.contributions) expect(text).not.toContain(project.title)
      expect(fallback.citizenReactions).toHaveLength(4)
      expect(fallback.recommendation).not.toMatch(/Переведите|Распределение|Направление/)
      if (lang === 'en') expect(text).not.toMatch(cyrillic)
      else for (const reaction of fallback.citizenReactions) expect(reaction.persona + reaction.text).toMatch(kazakh)
    }
    const tips = adviseDraft(draft, lang)
    expect(tips.length).toBeGreaterThan(0)
    if (lang === 'en') expect(JSON.stringify(tips)).not.toMatch(cyrillic)
    for (const tip of tips) if (tip.action) expect(validateAssistantAction(tip.action.do)).toEqual(tip.action.do)
  })

  it('understands English simulator questions and keeps actions constrained', () => {
    const questions = ['Create a full green city plan', 'Check my budget', 'How can I reduce traffic?', 'What are the synergies?', 'Review my choices after 3 years', 'Allocate 60 billion to transport', 'Tell me about adaptive-traffic-lights', 'Hello']
    for (const question of questions) {
      const reply = getLocalAssistantReply(question, draft, [], 'en')
      expect(reply.answer).not.toMatch(cyrillic)
      expect(reply.actions.length).toBeLessThanOrEqual(3)
      for (const action of reply.actions) expect(validateAssistantAction(action.do)).toEqual(action.do)
    }
    expect(getLocalAssistantReply(questions[0], emptyDraft(), [], 'en').actions[0].do.type).toBe('plan')
    expect(getLocalAssistantReply(questions[5], draft, [], 'en').actions[0].do).toEqual({ type: 'budget', category: 'transport', amount: 30 })
    const followup = getLocalAssistantReply('What else?', emptyDraft(), [{ role: 'user', content: 'How can I reduce traffic?' }], 'en')
    expect(followup.answer).toContain(localizedMetric('mobility', 'en'))
  })

  it('uses Kazakh project names in plans, named-project answers and synergies', () => {
    for (const question of ['Жоспар жаса', 'Кептелісті қалай азайтамын?', 'adaptive-traffic-lights', 'Синергиялар']) {
      const reply = getLocalAssistantReply(question, draft, [], 'kk')
      for (const project of PROJECTS) expect(reply.answer).not.toContain(project.title)
      expect(reply.answer).toMatch(kazakh)
    }
    expect(CATEGORIES).toHaveLength(5)
  })
})

describe('explanation language transport and errors', () => {
  it.each(['ru', 'kk', 'en'] as const)('sends %s at request level and preserves abort support', async (lang) => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, useFallback: true, reason: 'not_configured' }) })
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    const payload = buildAiPayload(result, '1y', lang)
    expect(await requestExplanation(payload, signal, lang)).toEqual({ source: 'fallback', reason: 'not_configured' })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ simulationResult: payload, lang })
    expect(fetch.mock.calls[0][1].signal).toBe(signal)
  })

  it('localizes known errors and hides untranslated server details', () => {
    expect(explanationFailureMessage('rate_limited', 'en')).toContain('Try again')
    expect(explanationFailureMessage('invalid_response', 'kk')).toContain('тексеруден')
    expect(explanationFailureMessage('внутренняя ошибка со сведениями сервера', 'en')).toBe(explanationFailureMessage('unavailable', 'en'))
  })
})
