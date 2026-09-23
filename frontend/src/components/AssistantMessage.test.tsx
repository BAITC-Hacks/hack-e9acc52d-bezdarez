import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AssistantMessage } from './AssistantMessage'

const render = (text: string) => renderToStaticMarkup(<AssistantMessage text={text} />)

describe('assistant message formatting', () => {
  it('makes explanatory text and code readable without interpreting code as markup', () => {
    const html = render('## Пример\n\n**Ответ:** используйте `print`.\n\n1. Подготовьте данные\n2. Запустите код\n\n```python\nprint("<hello>")\n```')
    expect(html).toContain('<strong>Ответ:</strong>')
    expect(html).toContain('<ol start="1"')
    expect(html).toContain('<li>Подготовьте данные</li>')
    expect(html).toContain('print(&quot;&lt;hello&gt;&quot;)')
    expect(html).not.toContain('<hello>')
    expect(html).not.toContain('```')
  })

  it('keeps HTML and unsafe links inert while allowing regular references', () => {
    const html = render('<img src=x onerror=alert(1)>\n[unsafe](javascript:alert(1))\n[docs](https://example.com/docs)')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('&lt;img')
    expect(html).toContain('href="https://example.com/docs"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('preserves blank lines and incomplete code fences from a model answer', () => {
    const html = render('Первый абзац\r\n\r\nВторой абзац\n\n```js\nconst answer = 42;')
    expect(html).toContain('Первый абзац</p>')
    expect(html).toContain('Второй абзац</p>')
    expect(html).toContain('<code>const answer = 42;</code>')
  })
})
