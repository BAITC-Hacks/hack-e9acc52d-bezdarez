import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ProjectCard } from '../components/ProjectCard'
import { CategoryNavigation } from '../components/CategoryNavigation'
import { PROJECTS } from '../data/projects'
import { SettingsProvider, useI18n, type Lang } from './i18n'
import { emptyDraft } from './storage'

afterEach(() => vi.unstubAllGlobals())

function renderWithSettings(settings: unknown, children: ReactNode) {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(settings) })
  return renderToStaticMarkup(<SettingsProvider>{children}</SettingsProvider>)
}

function Labels() {
  const { t, lang, category, metric } = useI18n()
  return <div lang={lang}>
    <h1>{t('nav.settings')}</h1>
    <p>{t('sim.direction', { n: 2, total: 5 })}</p>
    <p>{category('transport')} · {metric('ecology')}</p>
  </div>
}

describe('saved interface language', () => {
  it.each([
    ['ru', 'Настройки', 'Направление 2 из 5', 'Транспорт'],
    ['kk', 'Баптаулар', 'Бағыт: 2/5', 'Көлік'],
    ['en', 'Settings', 'Area 2 of 5', 'Transport'],
  ] as const)('restores %s and translates labels and variables together', (lang, title, direction, category) => {
    const html = renderWithSettings({ lang }, <Labels />)
    expect(html).toContain(`lang="${lang}"`)
    expect(html).toContain(title)
    expect(html).toContain(direction)
    expect(html).toContain(category)
    expect(html).not.toMatch(/\{(?:n|total)\}/)
  })

  it.each([null, { lang: 'unknown' }, {}])('uses Russian for unsupported or corrupt settings %j', (settings) => {
    expect(renderWithSettings(settings, <Labels />)).toContain('lang="ru"')
  })
})

describe('localized project UI', () => {
  it.each([
    ['kk', 'Бейімделетін бағдаршамдар', 'Жобаны таңдау', 'Қозғалыс қолайлылығы'],
    ['en', 'Adaptive traffic lights', 'Select project', 'Mobility'],
  ] as const)('renders %s catalogue text and accessible metric names', (lang, title, select, mobility) => {
    const project = PROJECTS[0]
    const html = renderWithSettings({ lang }, <ProjectCard project={project} selected={false} onSelect={() => {}} />)
    expect(html).toContain(title)
    expect(html).toContain(select)
    expect(html).toContain(`aria-label="${mobility}: +8"`)
    expect(html).not.toContain(project.title)
    expect(html).not.toContain(project.shortDescription)
    for (const risk of project.risks) expect(html).not.toContain(risk)
    if (lang === 'en') expect(html).not.toMatch(/[А-Яа-яЁё]/)
  })

  it('translates a previously selected project when the interface language changes', () => {
    const draft = emptyDraft()
    draft.transport.projectId = PROJECTS[0].id
    const render = (lang: Lang) => renderWithSettings({ lang }, <CategoryNavigation draft={draft} active="transport" onSelect={() => {}} />)
    expect(render('ru')).toContain('Адаптивные светофоры')
    expect(render('kk')).toContain('Бейімделетін бағдаршамдар')
    expect(render('en')).toContain('Adaptive traffic lights')
    expect(draft.transport.projectId).toBe(PROJECTS[0].id)
    expect(draft.transport.allocatedBudget).toBe(20)
  })
})
