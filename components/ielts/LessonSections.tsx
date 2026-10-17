import React from 'react';
import type { LibrarySection } from '../../data/ielts/library';

/** Body of a Library lesson: headings, paragraphs, bullets and example blocks. */
export default function LessonSections({ sections }: { sections: ReadonlyArray<LibrarySection> }) {
  return (
    <>
      {sections.map((s, i) => (
        <section key={i} className="space-y-2">
          {s.heading && <h2 className="text-title font-semibold text-slate-900 dark:text-white">{s.heading}</h2>}
          {s.text?.map((t, j) => (
            <p key={j} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {t}
            </p>
          ))}
          {s.bullets && (
            <ul className="space-y-1.5">
              {s.bullets.map((b, j) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {s.example && (
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
              {s.example}
            </pre>
          )}
        </section>
      ))}
    </>
  );
}
