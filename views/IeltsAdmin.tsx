/**
 * Admin page (IELTS phases I13 and R7): the Listening and Reading libraries
 * and the AI check. Only users listed in `app_admins` get past the gate; RLS
 * and the ai-proxy enforce the same rule on the server.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CircleAlert, Loader2, ShieldCheck } from 'lucide-react';
import AiHealthPanel from '../components/ielts/admin/AiHealthPanel';
import LibraryList, { LISTENING_LIST, READING_LIST, WRITING_LIST } from '../components/ielts/admin/LibraryList';
import ListeningEditor from '../components/ielts/admin/ListeningEditor';
import ReadingEditor from '../components/ielts/admin/ReadingEditor';
import WritingEditor, { type DraftWriter } from '../components/ielts/admin/WritingEditor';
import { hint, panel, secondaryBtn } from '../components/ielts/admin/styles';
import { Tabs } from '../components/ui/Tabs';
import { duplicateItem, emptyItem, type LibraryItem } from '../services/listeningLibraryLogic';
import { deleteLibraryItem, getAllLibrary, isAppAdmin, LIBRARY_LIST_LIMIT, saveLibraryItem } from '../services/listeningLibraryService';
import { duplicateReadingItem, emptyReadingItem, type ReadingLibraryItem } from '../services/readingLibraryLogic';
import { deleteReadingLibraryItem, getAllReadingLibrary, READING_LIST_LIMIT, saveReadingLibraryItem } from '../services/readingLibraryService';
import { duplicateWritingItem, emptyWritingItem, type WritingLibraryItem } from '../services/writingLibraryLogic';
import { deleteWritingLibraryItem, getAllWritingLibrary, saveWritingLibraryItem, WRITING_LIST_LIMIT } from '../services/writingLibraryService';
import { draftWritingPrompt } from '../services/writingGenerationService';

/** Reads and writes one skill's library. */
export interface LibraryApi<T> {
  list: () => Promise<T[]>;
  save: (item: T) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

export interface AdminApi extends LibraryApi<LibraryItem> {
  isAdmin: (userId: string) => Promise<boolean>;
  reading: LibraryApi<ReadingLibraryItem>;
  writing: LibraryApi<WritingLibraryItem>;
  /** Asks the AI for a draft prompt; omit to hide the button. */
  draftWriting?: DraftWriter;
}

const defaultApi: AdminApi = {
  isAdmin: isAppAdmin,
  list: getAllLibrary,
  save: saveLibraryItem,
  remove: deleteLibraryItem,
  reading: { list: getAllReadingLibrary, save: saveReadingLibraryItem, remove: deleteReadingLibraryItem },
  writing: { list: getAllWritingLibrary, save: saveWritingLibraryItem, remove: deleteWritingLibraryItem },
  draftWriting: draftWritingPrompt,
};

interface Props {
  userId: string;
  onBack: () => void;
  /** Opens a test on the practice screen without saving an attempt; the editor's state is kept. */
  onPreview: (editing: Extract<AdminEditing, { skill: 'listening' | 'reading' }>) => void;
  /** The test being edited when coming back from a preview. */
  editing?: AdminEditing | null;
  onEditingChange?: (editing: AdminEditing | null) => void;
  api?: AdminApi;
  newId?: () => string;
}

/** The test open in the editor: its draft and what is stored (null when never saved). */
export type AdminEditing =
  | { skill: 'listening'; item: LibraryItem; saved: LibraryItem | null }
  | { skill: 'reading'; item: ReadingLibraryItem; saved: ReadingLibraryItem | null }
  | { skill: 'writing'; item: WritingLibraryItem; saved: WritingLibraryItem | null };

type Tab = 'listening' | 'reading' | 'writing' | 'health';

const ADMIN_SQL = `insert into public.app_admins (user_id)
select id from auth.users where email = '<email của bạn>'
on conflict do nothing;`;

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * One skill's list: loading, errors, duplicate and delete. The parent keeps
 * the items so a save in the editor shows up when the list comes back.
 */
function useLibrary<T extends { id: string }>(api: LibraryApi<T>, enabled: boolean) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await api.list());
    } catch (err) {
      setError(errorText(err));
      setItems([]);
    }
  }, [api]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const stored = (item: T) => setItems((list) => [item, ...(list ?? []).filter((i) => i.id !== item.id)]);

  const busy = async (item: T, what: string, run: () => Promise<void>) => {
    setBusyId(item.id);
    setError('');
    try {
      await run();
    } catch (err) {
      setError(`${what}: ${errorText(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  return {
    items,
    error,
    busyId,
    stored,
    duplicate: (item: T, copy: T) => busy(item, 'Không nhân bản được', async () => stored(await api.save(copy))),
    remove: (item: T) =>
      busy(item, 'Không xoá được', async () => {
        await api.remove(item.id);
        setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
      }),
  };
}

export default function IeltsAdmin({ userId, onBack, onPreview, editing: editingProp = null, onEditingChange, api = defaultApi, newId = () => crypto.randomUUID() }: Props) {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>(editingProp?.skill ?? 'listening');
  const [editingLocal, setEditingLocal] = useState(editingProp);
  const editing = onEditingChange ? editingProp : editingLocal;
  const setEditing = (e: AdminEditing | null) => (onEditingChange ? onEditingChange(e) : setEditingLocal(e));
  const listening = useLibrary(api, !!admin);
  const reading = useLibrary(api.reading, !!admin);
  const writing = useLibrary(api.writing, !!admin);

  useEffect(() => {
    let live = true;
    api.isAdmin(userId).then((ok) => live && setAdmin(ok), () => live && setAdmin(false));
    return () => {
      live = false;
    };
  }, [api, userId]);

  const saveListening = async (item: LibraryItem) => {
    const stored = await api.save(item);
    listening.stored(stored);
    setEditing({ skill: 'listening', item: stored, saved: stored });
    return stored;
  };

  const saveReading = async (item: ReadingLibraryItem) => {
    const stored = await api.reading.save(item);
    reading.stored(stored);
    setEditing({ skill: 'reading', item: stored, saved: stored });
    return stored;
  };

  const saveWriting = async (item: WritingLibraryItem) => {
    const stored = await api.writing.save(item);
    writing.stored(stored);
    setEditing({ skill: 'writing', item: stored, saved: stored });
    return stored;
  };

  const header = (
    <header className="flex items-start gap-2">
      <button type="button" onClick={onBack} className={secondaryBtn.replace('px-4', 'px-3')} aria-label="Quay lại IELTS">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div>
        <p className="flex items-center gap-1.5 text-caption font-medium text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-tone-periwinkle-fg" /> Quản trị
        </p>
        <h1 className="text-heading font-bold text-slate-900 dark:text-white">Quản lý nội dung IELTS</h1>
      </div>
    </header>
  );

  if (admin === null) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 anim-fade-up">
        {header}
        <p className={`flex items-center gap-2 ${hint}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra quyền…
        </p>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 anim-fade-up">
        {header}
        <section className={`${panel} space-y-3 p-5`}>
          <h2 className="text-title font-semibold text-slate-900 dark:text-white">Bạn chưa có quyền quản trị</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Trang này dành cho người soạn đề. Để cấp quyền, chạy migration <code className="break-all">docs/migrations/011_listening_library.sql</code> trong Supabase SQL Editor, rồi chạy:
          </p>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-900 p-3 text-caption text-slate-100 dark:bg-slate-950">{ADMIN_SQL}</pre>
          <p className={hint}>Sau đó tải lại trang.</p>
        </section>
      </div>
    );
  }

  const lib = tab === 'reading' ? reading : tab === 'writing' ? writing : listening;
  const error = editing ? '' : tab === 'health' ? '' : lib.error;
  const limit = tab === 'reading' ? READING_LIST_LIMIT : tab === 'writing' ? WRITING_LIST_LIMIT : LIBRARY_LIST_LIMIT;
  const loading = <p className={`flex items-center gap-2 ${hint}`}><Loader2 className="h-4 w-4 animate-spin" /> Đang tải đề…</p>;
  const limitNote = (n: number) => n >= limit && <p className={hint}>Đang hiện {limit} đề sửa gần nhất; đề cũ hơn không có trong danh sách.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 anim-fade-up">
      {!editing && header}
      {!editing && (
        <Tabs<Tab>
          label="Mục quản trị"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'listening', label: 'Đề Listening', count: listening.items?.length },
            { id: 'reading', label: 'Đề Reading', count: reading.items?.length },
            { id: 'writing', label: 'Đề Writing', count: writing.items?.length },
            { id: 'health', label: 'Kiểm tra AI' },
          ]}
        />
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-tone-blush p-3 text-sm text-tone-blush-fg">
          <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}

      {editing?.skill === 'listening' ? (
        <ListeningEditor
          key={editing.item.id}
          item={editing.item}
          saved={editing.saved}
          onSave={saveListening}
          onClose={() => setEditing(null)}
          onPreview={(item, saved) => onPreview({ skill: 'listening', item, saved })}
        />
      ) : editing?.skill === 'reading' ? (
        <ReadingEditor
          key={editing.item.id}
          item={editing.item}
          saved={editing.saved}
          onSave={saveReading}
          onClose={() => setEditing(null)}
          onPreview={(item, saved) => onPreview({ skill: 'reading', item, saved })}
        />
      ) : editing?.skill === 'writing' ? (
        <WritingEditor
          key={editing.item.id}
          item={editing.item}
          saved={editing.saved}
          onSave={saveWriting}
          onClose={() => setEditing(null)}
          draftWithAi={api.draftWriting}
        />
      ) : tab === 'health' ? (
        <AiHealthPanel />
      ) : tab === 'writing' ? (
        writing.items === null ? (
          loading
        ) : (
          <>
            {limitNote(writing.items.length)}
            <LibraryList
              config={WRITING_LIST}
              items={writing.items}
              busyId={writing.busyId}
              onNew={(task) => setEditing({ skill: 'writing', item: emptyWritingItem(newId(), task), saved: null })}
              onEdit={(item) => setEditing({ skill: 'writing', item, saved: item })}
              onDuplicate={(item) => writing.duplicate(item, duplicateWritingItem(item, newId()))}
              onDelete={writing.remove}
            />
          </>
        )
      ) : tab === 'reading' ? (
        reading.items === null ? (
          loading
        ) : (
          <>
            {limitNote(reading.items.length)}
            <LibraryList
              config={READING_LIST}
              items={reading.items}
              busyId={reading.busyId}
              onNew={(kind) => setEditing({ skill: 'reading', item: emptyReadingItem(newId(), kind), saved: null })}
              onEdit={(item) => setEditing({ skill: 'reading', item, saved: item })}
              onDuplicate={(item) => reading.duplicate(item, duplicateReadingItem(item, newId()))}
              onDelete={reading.remove}
            />
          </>
        )
      ) : listening.items === null ? (
        loading
      ) : (
        <>
          {limitNote(listening.items.length)}
          <LibraryList
            config={LISTENING_LIST}
            items={listening.items}
            busyId={listening.busyId}
            onNew={(kind) => setEditing({ skill: 'listening', item: emptyItem(newId(), kind), saved: null })}
            onEdit={(item) => setEditing({ skill: 'listening', item, saved: item })}
            onDuplicate={(item) => listening.duplicate(item, duplicateItem(item, newId()))}
            onDelete={listening.remove}
          />
        </>
      )}
    </div>
  );
}
