import type { ReactNode } from 'react'

/** A small Markdown subset. All content stays React text; raw HTML is never used. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const tokens = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g
  let start = 0
  for (const match of text.matchAll(tokens)) {
    if (match.index > start) parts.push(text.slice(start, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      parts.push(<code key={match.index} className="rounded bg-ink/5 px-1 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>)
    } else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token)!
      parts.push(<a key={match.index} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-good-ink underline underline-offset-2">{link[1]}</a>)
    }
    start = match.index + token.length
  }
  if (start < text.length) parts.push(text.slice(start))
  return parts
}

const listItem = (line: string) => /^\s*([-*+] |\d+[.)] )(.+)$/.exec(line)
const heading = (line: string) => /^#{1,6}\s+(.+)$/.exec(line)
const fence = (line: string) => /^\s*```([\w+#.-]*)\s*$/.exec(line)

export function AssistantMessage({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const key = index
    if (!line.trim()) { index++; continue }
    const code = fence(line)
    if (code) {
      const content: string[] = []
      index++
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) content.push(lines[index++])
      if (index < lines.length) index++
      blocks.push(<div key={key} className="overflow-hidden rounded-xl border border-line bg-surface">
        {code[1] && <div className="border-b border-line px-3 py-1 text-[10px] font-semibold text-muted">{code[1]}</div>}
        <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{content.join('\n')}</code></pre>
      </div>)
      continue
    }
    const title = heading(line)
    if (title) {
      blocks.push(<p key={key} className="font-bold">{inline(title[1])}</p>)
      index++
      continue
    }
    const item = listItem(line)
    if (item) {
      const ordered = /^\d/.test(item[1])
      const items: ReactNode[] = []
      while (index < lines.length) {
        const next = listItem(lines[index])
        if (!next || /^\d/.test(next[1]) !== ordered) break
        items.push(<li key={index}>{inline(next[2])}</li>)
        index++
      }
      blocks.push(ordered
        ? <ol key={key} start={Number.parseInt(item[1], 10)} className="list-decimal space-y-1 pl-5">{items}</ol>
        : <ul key={key} className="list-disc space-y-1 pl-5">{items}</ul>)
      continue
    }
    const paragraph = [line]
    index++
    while (index < lines.length && lines[index].trim() && !fence(lines[index]) && !heading(lines[index]) && !listItem(lines[index])) paragraph.push(lines[index++])
    blocks.push(<p key={key} className="whitespace-pre-wrap">{inline(paragraph.join('\n'))}</p>)
  }
  return <div className="min-w-0 space-y-2 break-words [overflow-wrap:anywhere]">{blocks}</div>
}
