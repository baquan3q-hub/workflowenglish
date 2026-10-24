import React, { memo } from 'react';

/**
 * Small Markdown renderer for mentor replies: headings, lists, bold/italic,
 * inline and fenced code, tables, quotes and rules. Memoised, so earlier
 * messages do not re-render while a new reply streams in.
 */

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Italic may contain bold (*a **b** c*); its closing star is not part of a "**".
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*(?=[^*\s])(?:[^*]|\*\*[^*]+\*\*)+?\*(?!\*)|(?<!\w)_[^_\s][^_]*_(?!\w))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith('**')) out.push(<strong key={k} className="font-semibold text-slate-900 dark:text-white">{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k} className="rounded bg-tone-lavender-soft px-1 py-0.5 font-mono text-[12px] text-tone-lavender-fg">{t.slice(1, -1)}</code>);
    else out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l) && l.includes('-');
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function render(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const k = `b${i}`;

    // Fenced code
    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(
        <pre key={k} className="my-2 overflow-x-auto rounded-lg bg-slate-100 p-3 font-mono text-[12px] leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {body.join('\n')}
        </pre>,
      );
      continue;
    }

    // Table
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        <div key={k} className="my-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-100">{inline(c, `${k}h${j}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-slate-100 dark:border-slate-800">
                  {r.map((c, j) => (
                    <td key={j} className="px-2.5 py-1.5 align-top">{inline(c, `${k}r${ri}c${j}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lists
    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ''));
      const Tag = ordered ? 'ol' : 'ul';
      out.push(
        <Tag key={k} className={`my-1.5 space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-slate-400`}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${k}-${j}`)}</li>
          ))}
        </Tag>,
      );
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const size = h[1].length <= 2 ? 'text-[15px]' : 'text-[14px]';
      out.push(<p key={k} className={`mb-1 mt-3 font-bold text-slate-900 first:mt-0 dark:text-white ${size}`}>{inline(h[2], k)}</p>);
    } else if (/^>\s?/.test(line)) {
      out.push(
        <blockquote key={k} className="my-1.5 border-l-2 border-tone-lavender-accent pl-3 italic text-slate-600 dark:text-slate-300">
          {inline(line.replace(/^>\s?/, ''), k)}
        </blockquote>,
      );
    } else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      out.push(<hr key={k} className="my-3 border-slate-200 dark:border-slate-700" />);
    } else if (line.trim()) {
      out.push(<p key={k} className="my-1 first:mt-0 last:mb-0">{inline(line, k)}</p>);
    }
    i++;
  }
  return out;
}

export const ChatMarkdown = memo(function ChatMarkdown({ text }: { text: string }) {
  return <div className="text-[13.5px] leading-relaxed">{render(text)}</div>;
});

export default ChatMarkdown;
