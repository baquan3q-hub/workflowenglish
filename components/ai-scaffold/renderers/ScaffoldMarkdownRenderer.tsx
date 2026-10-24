import React from 'react';
import { InteractiveSentenceList } from './InteractiveSentenceCard';
import { InteractiveVocabGrid } from './InteractiveVocabCard';
import { InteractiveQuizList } from './InteractiveQuizCard';
import { SentenceBreakdownItem, ScaffoldVocabItem, InteractiveQuizItem } from '../../../services/scaffoldActionTypes';

interface ScaffoldMarkdownRendererProps {
  content: string;
  userId?: string | null;
}

export function ScaffoldMarkdownRenderer({ content, userId }: ScaffoldMarkdownRendererProps) {
  // Check if content contains structured blocks
  const segments: React.ReactNode[] = [];
  let remaining = content;
  let keyIndex = 0;

  // Pattern to find structured blocks like ```json:scaffold_sentences ... ```
  // or ```json:scaffold_vocab ... ``` or ```json:scaffold_quiz ... ```
  const blockRegex = /```(?:json:)?(scaffold_sentences|scaffold_vocab|scaffold_quiz)\s*([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(remaining)) !== null) {
    const textBefore = remaining.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      segments.push(
        <div key={`md-${keyIndex++}`}>
          {renderStandardMarkdown(textBefore)}
        </div>
      );
    }

    const blockType = match[1];
    const rawJson = match[2].trim();

    try {
      const parsedData = JSON.parse(rawJson);
      if (blockType === 'scaffold_sentences' && Array.isArray(parsedData)) {
        segments.push(
          <InteractiveSentenceList
            key={`sentences-${keyIndex++}`}
            sentences={parsedData as SentenceBreakdownItem[]}
          />
        );
      } else if (blockType === 'scaffold_vocab' && Array.isArray(parsedData)) {
        segments.push(
          <InteractiveVocabGrid
            key={`vocab-${keyIndex++}`}
            vocabulary={parsedData as ScaffoldVocabItem[]}
            userId={userId}
          />
        );
      } else if (blockType === 'scaffold_quiz' && Array.isArray(parsedData)) {
        segments.push(
          <InteractiveQuizList
            key={`quiz-${keyIndex++}`}
            quizzes={parsedData as InteractiveQuizItem[]}
          />
        );
      } else {
        // Fallback to json code block
        segments.push(
          <pre key={`code-${keyIndex++}`} className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-xs font-mono overflow-x-auto">
            {rawJson}
          </pre>
        );
      }
    } catch {
      // While streaming, JSON might be incomplete; show typing or clean text
      segments.push(
        <div key={`incomplete-${keyIndex++}`} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl my-2 text-xs text-indigo-700 dark:text-indigo-300 animate-pulse">
          ⚡ Đang tạo dữ liệu tương tác chuyên sâu...
        </div>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  const trailingText = remaining.substring(lastIndex);
  if (trailingText.trim()) {
    segments.push(
      <div key={`md-trailing-${keyIndex++}`}>
        {renderStandardMarkdown(trailingText)}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {segments.length > 0 ? segments : renderStandardMarkdown(content)}
    </div>
  );
}

// ─── Standard Markdown Parser ──────────────────────────────────────────

function renderStandardMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <Tag key={`list-${elements.length}`} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 my-1.5 space-y-0.5`}>
          {listItems.map((item, i) => (
            <li key={i} className="text-[13px] leading-relaxed">
              {formatInline(item)}
            </li>
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  const formatInline = (line: string): React.ReactNode => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Inline code: `text`
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code key={`${i}-${j}`} className="bg-slate-100 dark:bg-slate-700 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-xs font-mono">
              {cp.slice(1, -1)}
            </code>
          );
        }
        return cp;
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={i} className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-3 mb-1">{formatInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={i} className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-3 mb-1">{formatInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={i} className="font-bold text-base text-slate-800 dark:text-slate-100 mt-3 mb-1.5">{formatInline(line.slice(2))}</h2>);
    }
    // Unordered lists
    else if (/^[-*•] /.test(line)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(line.replace(/^[-*•] /, ''));
    }
    // Ordered lists
    else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(line.replace(/^\d+\.\s/, ''));
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={i} className="border-slate-200 dark:border-slate-600 my-2" />);
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
    }
    // Simple table row
    else if (line.includes('|') && line.trim().startsWith('|')) {
      flushList();
      const cells = line.split('|').filter(c => c.trim() !== '');
      if (cells.every(c => /^[\s-:]+$/.test(c))) continue;
      const isHeader = i + 1 < lines.length && /^\|[\s-:|]+\|$/.test(lines[i + 1]?.trim() || '');
      elements.push(
        <div key={i} className={`flex gap-2 px-2 py-1 text-xs ${isHeader ? 'font-semibold bg-slate-50 dark:bg-slate-700/50 rounded' : ''}`}>
          {cells.map((cell, ci) => (
            <span key={ci} className="flex-1 truncate">{formatInline(cell.trim())}</span>
          ))}
        </div>
      );
    }
    // Normal paragraph
    else {
      flushList();
      elements.push(<p key={i} className="text-[13px] leading-relaxed my-1">{formatInline(line)}</p>);
    }
  }

  flushList();
  return elements;
}
