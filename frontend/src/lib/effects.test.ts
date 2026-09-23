import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

// В новых браузерах scrollTo/scrollIntoView возвращают Promise. Эффект-стрелка без фигурных
// скобок возвращает его React-у как «функцию очистки» — и приложение падает при размонтировании.
it('эффекты не возвращают значение выражения (только блочное тело)', () => {
  const root = join(__dirname, '..')
  const files: string[] = []
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.tsx?$/.test(f)) files.push(p)
    }
  }
  walk(root)
  const bad = files.flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => ({ line, at: `${f}:${i + 1}` }))
      .filter(({ line }) => /use(Layout)?Effect\(\(\) => [^{\s]/.test(line))
      .map(({ at }) => at),
  )
  expect(bad).toEqual([])
})
