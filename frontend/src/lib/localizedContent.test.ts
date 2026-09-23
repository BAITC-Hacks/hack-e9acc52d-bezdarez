import { describe, expect, it } from 'vitest'
import { CATEGORIES, CITY_PROBLEMS } from '../data/baseline'
import { DISTRICTS } from '../data/districts'
import { PROJECT_COPY } from '../data/locales/projects'
import { PROJECTS } from '../data/projects'
import { SYNERGIES } from '../data/synergies'
import type { SelectedDecision } from '../types/simulation'
import { calculateBalancePenalties, calculateMaintenancePenalty } from './calculatePenalties'
import { calculateSimulation } from './calculateSimulation'
import { determineProfile } from './determineProfile'
import {
  localizeDistrict, localizePenalty, localizeProfile, localizeProject,
  localizeSimulationResult, localizeSynergy, localizedCityProblems, localizedSynergyDescription,
} from './localizedContent'

const DISPLAY_FIELDS = new Set([
  'title', 'shortDescription', 'fullDescription', 'description', 'benefits', 'risks', 'tags',
  'name', 'short', 'profile', 'problems', 'positiveEffects', 'appliedSynergies',
])

function withoutDisplayFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutDisplayFields)
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).filter(([key]) => !DISPLAY_FIELDS.has(key)).map(([key, child]) => [key, withoutDisplayFields(child)]),
  )
  return value
}

const decisions = (offset: number, budgets: number[] = [20, 20, 20, 20, 20]): SelectedDecision[] =>
  CATEGORIES.map((category, index) => ({
    category,
    projectId: PROJECTS.filter((p) => p.category === category)[offset].id,
    allocatedBudget: budgets[index],
  }))

describe.each(['kk', 'en'] as const)('%s content coverage', (lang) => {
  it('translates every text field of every project and retains all model inputs', () => {
    expect(Object.keys(PROJECT_COPY[lang]).sort()).toEqual(PROJECTS.map((p) => p.id).sort())
    const snapshot = structuredClone(PROJECTS)
    for (const source of PROJECTS) {
      const translated = localizeProject(source, lang)
      expect(withoutDisplayFields(translated), source.id).toEqual(withoutDisplayFields(source))
      for (const key of ['title', 'shortDescription', 'fullDescription'] as const) {
        expect(translated[key].trim(), `${source.id}.${key}`).not.toBe('')
        expect(translated[key], `${source.id}.${key}`).not.toBe(source[key])
      }
      for (const key of ['benefits', 'risks', 'tags'] as const) {
        expect(translated[key], `${source.id}.${key}`).toHaveLength(source[key].length)
        expect(translated[key].every((text) => text.trim().length > 0)).toBe(true)
      }
      if (lang === 'en') expect(JSON.stringify(PROJECT_COPY[lang][source.id])).not.toMatch(/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/u)
      else expect(`${translated.shortDescription} ${translated.fullDescription}`).toMatch(/[әғқңөұүһі]/u)
    }
    expect(PROJECTS).toEqual(snapshot)
  })

  it('translates all districts while retaining population weights, scores and extra projection fields', () => {
    for (const district of DISTRICTS) {
      const source = { ...district, indexAfter: 72.3 }
      const translated = localizeDistrict(source, lang)
      expect(withoutDisplayFields(translated)).toEqual(withoutDisplayFields(source))
      expect(translated.name).not.toBe(district.name)
      expect(translated.profile).not.toBe(district.profile)
      expect(translated.problems).toHaveLength(district.problems.length)
      for (const problem of translated.problems) expect(district.problems).not.toContain(problem)
      if (lang === 'en') expect(`${translated.name} ${translated.short} ${translated.profile} ${translated.problems.join(' ')}`).not.toMatch(/[А-Яа-яЁё]/u)
    }
    expect(localizedCityProblems(lang)).toHaveLength(CITY_PROBLEMS.length)
    for (const problem of localizedCityProblems(lang)) expect(CITY_PROBLEMS).not.toContain(problem)
  })

  it('uses the translated project names in every synergy and retains each bonus', () => {
    for (const synergy of SYNERGIES) {
      const translated = localizeSynergy(synergy, lang)
      expect(withoutDisplayFields(translated)).toEqual(withoutDisplayFields(synergy))
      expect(translated.description).not.toBe(synergy.description)
      expect(localizedSynergyDescription(synergy.description, lang)).toBe(translated.description)
      expect(localizedSynergyDescription(translated.description, 'ru')).toBe(synergy.description)
      for (const id of synergy.projects) expect(translated.description).toContain(localizeProject(PROJECTS.find((p) => p.id === id)!, lang).title)
      for (const bonus of Object.values(synergy.bonus)) expect(translated.description).toContain(`+${bonus}`)
      if (lang === 'en') expect(translated.description).not.toMatch(/[А-Яа-яЁё]/u)
    }
  })

  it('translates every reachable strategy profile without changing the selected profile', () => {
    const profiles = [
      [40, 5, 5, 10, 40], [15, 40, 15, 15, 15], [15, 15, 40, 15, 15],
      [15, 15, 15, 40, 15], [10, 20, 20, 15, 35], [20, 20, 20, 20, 20],
    ].map((budgets) => determineProfile(decisions(0, budgets)))
    expect(new Set(profiles.map((p) => p.id)).size).toBe(6)
    for (const profile of profiles) {
      const translated = localizeProfile(profile, lang)
      expect(translated.id).toBe(profile.id)
      expect(translated.description).not.toBe(profile.description)
      expect(translated.title.length).toBeGreaterThan(0)
      if (lang === 'en') expect(JSON.stringify(translated)).not.toMatch(/[А-Яа-яЁё]/u)
    }
  })

  it('renders penalty amounts from metadata even if the old description is missing or already translated', () => {
    const penalties = calculateBalancePenalties(decisions(0, [5, 40, 20, 20, 15]))
    penalties.push(calculateMaintenancePenalty(18, '3y')!)
    expect(penalties.map((p) => p.kind)).toEqual(['underfunded', 'overfunded', 'maintenance'])
    const expectedAmounts = lang === 'kk' ? ['5 бірлік', '40 бірлік', '18'] : ['5 units', '40 units', '18']
    penalties.forEach((penalty, index) => {
      const translated = localizePenalty({ ...penalty, description: '' }, lang)
      expect(withoutDisplayFields(translated)).toEqual(withoutDisplayFields(penalty))
      expect(translated.description).toContain(expectedAmounts[index])
      expect(translated.description).toContain(lang === 'kk' ? 'айып ұпайы' : 'penalty')
      expect(localizePenalty(translated, lang)).toEqual(translated)
    })
  })

  it('localizes complete simulation outcomes without changing numbers, IDs, ordering or source results', () => {
    const allocations = [
      [20, 20, 20, 20, 20], [40, 5, 5, 40, 10], [5, 5, 40, 10, 40],
      [30, 20, 20, 10, 20], [5, 25, 15, 15, 40], [10, 20, 20, 30, 20],
    ]
    for (let offset = 0; offset < 6; offset += 1) {
      const result = calculateSimulation(decisions(offset, allocations[offset]))
      const snapshot = structuredClone(result)
      const translated = localizeSimulationResult(result, lang)
      expect(withoutDisplayFields(translated)).toEqual(withoutDisplayFields(result))
      expect(result).toEqual(snapshot)
      expect(localizeSimulationResult(translated, lang)).toEqual(translated)
      for (const horizon of ['oneYear', 'threeYears'] as const) {
        expect(translated[horizon].positiveEffects).toHaveLength(result[horizon].positiveEffects.length)
        expect(translated[horizon].risks).toHaveLength(result[horizon].risks.length)
        for (const text of [...translated[horizon].positiveEffects, ...translated[horizon].risks]) {
          expect([...result[horizon].positiveEffects, ...result[horizon].risks]).not.toContain(text)
          expect(text).not.toContain('undefined')
          if (lang === 'en') expect(text).not.toMatch(/[А-Яа-яЁё]/u)
        }
      }
      expect(translated.appliedSynergies).toHaveLength(result.appliedSynergies.length)
    }
  })
})

it('leaves Russian content intact', () => {
  for (const project of PROJECTS) expect(localizeProject(project, 'ru')).toBe(project)
  for (const district of DISTRICTS) expect(localizeDistrict(district, 'ru')).toBe(district)
  for (const synergy of SYNERGIES) expect(localizeSynergy(synergy, 'ru')).toBe(synergy)
  const result = calculateSimulation(decisions(0))
  expect(localizeSimulationResult(result, 'ru')).toBe(result)
  expect(localizeProfile(result.strategyProfile, 'ru')).toBe(result.strategyProfile)
  expect(localizedCityProblems('ru')).toEqual(CITY_PROBLEMS)
})
