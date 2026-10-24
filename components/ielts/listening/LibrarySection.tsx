/**
 * "Đề luyện thêm": tests published from the admin page. Hidden when there
 * are none (also before migration 011 is applied).
 */
import React, { useEffect, useState } from 'react';
import { ArrowRight, Clock, Library, Youtube } from 'lucide-react';
import { GROUP_TYPE_LABELS, PART_DESCRIPTIONS_VI } from '../../../data/ielts/listening';
import type { ListeningTest } from '../../../data/ielts/listening/types';
import { getPublishedLibrary } from '../../../services/listeningLibraryService';
import { panel, primaryBtn, secondaryBtn as sharedSecondary, tag } from '../../ui/styles';

interface Props {
  onStart: (testId: string, sectionIds: string[]) => void;
  load?: () => Promise<ListeningTest[]>;
}

const secondaryBtn = sharedSecondary.replace('px-4', 'px-3');

const types = (test: ListeningTest) => [...new Set(test.sections.flatMap((s) => s.groups.map((g) => GROUP_TYPE_LABELS[g.type])))];

export default function LibrarySection({ onStart, load = getPublishedLibrary }: Props) {
  const [tests, setTests] = useState<ListeningTest[]>([]);

  useEffect(() => {
    let live = true;
    load().then(
      (t) => live && setTests(t),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [load]);

  if (!tests.length) return null;

  return (
    <section aria-labelledby="listening-library">
      <h2 id="listening-library" className="flex items-center gap-2 text-title font-semibold text-slate-900 dark:text-white">
        <Library className="h-5 w-5 text-slate-500" /> Đề luyện thêm
      </h2>
      <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">Đề do giáo viên soạn, cập nhật thường xuyên.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {tests.map((test) => {
          const full = test.kind === 'full';
          const first = test.sections[0];
          const recorded = test.sections.some((s) => s.youtube);
          return (
            <li key={test.id} className={`${panel} flex flex-col p-4`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">
                  {full ? '4 part · 40 câu' : `Part ${first.part} · ${PART_DESCRIPTIONS_VI[first.part]}`}
                </span>
                {recorded && (
                  <span className={tag}>
                    <Youtube className="h-3 w-3" /> Video
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{test.title}</h3>
              <p className="mt-0.5 flex-1 text-caption text-slate-500 dark:text-slate-400">{test.descriptionVi}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {types(test).map((t) => (
                  <span key={t} className={tag}>
                    {t}
                  </span>
                ))}
              </div>
              {full ? (
                <div className="mt-4 space-y-2">
                  <button type="button" onClick={() => onStart(test.id, [])} className={`${primaryBtn} w-full`}>
                    <Clock className="h-4 w-4" /> Làm cả đề
                  </button>
                  <div className="grid grid-cols-4 gap-2">
                    {test.sections.map((s) => (
                      <button key={s.id} type="button" onClick={() => onStart(test.id, [s.id])} className={secondaryBtn} title={s.title}>
                        Part {s.part}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => onStart(test.id, [])} className={`${secondaryBtn} mt-4 w-full`}>
                  Bắt đầu <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
