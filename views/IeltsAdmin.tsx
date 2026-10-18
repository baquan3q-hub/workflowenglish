/**
 * Admin page (IELTS phase I13): the Listening library and the AI check.
 * Only users listed in `app_admins` get past the gate; RLS and the ai-proxy
 * enforce the same rule on the server.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CircleAlert, Loader2, ShieldCheck } from 'lucide-react';
import AiHealthPanel from '../components/ielts/admin/AiHealthPanel';
import LibraryList from '../components/ielts/admin/LibraryList';
import ListeningEditor from '../components/ielts/admin/ListeningEditor';
import { hint, panel, secondaryBtn } from '../components/ielts/admin/styles';
import { Tabs } from '../components/ui/Tabs';
import { duplicateItem, emptyItem, type LibraryItem } from '../services/listeningLibraryLogic';
import { deleteLibraryItem, getAllLibrary, isAppAdmin, LIBRARY_LIST_LIMIT, saveLibraryItem } from '../services/listeningLibraryService';

export interface AdminApi {
  isAdmin: (userId: string) => Promise<boolean>;
  list: () => Promise<LibraryItem[]>;
  save: (item: LibraryItem) => Promise<LibraryItem>;
  remove: (id: string) => Promise<void>;
}

const defaultApi: AdminApi = { isAdmin: isAppAdmin, list: getAllLibrary, save: saveLibraryItem, remove: deleteLibraryItem };

interface Props {
  userId: string;
  onBack: () => void;
  /** Opens a test on the practice screen without saving an attempt; the editor's state is kept. */
  onPreview: (editing: AdminEditing) => void;
  /** The test being edited when coming back from a preview. */
  editing?: AdminEditing | null;
  onEditingChange?: (editing: AdminEditing | null) => void;
  api?: AdminApi;
  newId?: () => string;
}

/** The test open in the editor: its draft and what is stored (null when never saved). */
export interface AdminEditing {
  item: LibraryItem;
  saved: LibraryItem | null;
}

type Tab = 'tests' | 'health';

const ADMIN_SQL = `insert into public.app_admins (user_id)
select id from auth.users where email = '<email của bạn>'
on conflict do nothing;`;

export default function IeltsAdmin({ userId, onBack, onPreview, editing: editingProp = null, onEditingChange, api = defaultApi, newId = () => crypto.randomUUID() }: Props) {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('tests');
  const [editingLocal, setEditingLocal] = useState(editingProp);
  const [busyId, setBusyId] = useState<string | null>(null);
  const editing = onEditingChange ? editingProp : editingLocal;
  const setEditing = (e: AdminEditing | null) => (onEditingChange ? onEditingChange(e) : setEditingLocal(e));

  useEffect(() => {
    let live = true;
    api.isAdmin(userId).then((ok) => live && setAdmin(ok), () => live && setAdmin(false));
    return () => {
      live = false;
    };
  }, [api, userId]);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await api.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    }
  }, [api]);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  const save = async (item: LibraryItem) => {
    const stored = await api.save(item);
    setItems((list) => [stored, ...(list ?? []).filter((i) => i.id !== stored.id)]);
    setEditing({ item: stored, saved: stored });
    return stored;
  };

  const duplicate = async (item: LibraryItem) => {
    setBusyId(item.id);
    setError('');
    try {
      const copy = await api.save(duplicateItem(item, newId()));
      setItems((list) => [copy, ...(list ?? [])]);
    } catch (err) {
      setError(`Không nhân bản được: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: LibraryItem) => {
    setBusyId(item.id);
    setError('');
    try {
      await api.remove(item.id);
      setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
    } catch (err) {
      setError(`Không xoá được: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <header className="flex items-start gap-2">
      <button type="button" onClick={onBack} className={`${secondaryBtn} !px-3`} aria-label="Quay lại IELTS">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div>
        <p className="flex items-center gap-1.5 text-caption font-medium text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Quản trị
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 anim-fade-up">
      {!editing && header}
      {!editing && (
        <Tabs<Tab>
          label="Mục quản trị"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'tests', label: 'Đề Listening', count: items?.length },
            { id: 'health', label: 'Kiểm tra AI' },
          ]}
        />
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}

      {editing ? (
        <ListeningEditor key={editing.item.id} item={editing.item}
          saved={editing.saved}
          onSave={save}
          onClose={() => setEditing(null)}
          onPreview={(item, saved) => onPreview({ item, saved })}
        />
      ) : tab === 'health' ? (
        <AiHealthPanel />
      ) : items === null ? (
        <p className={`flex items-center gap-2 ${hint}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải đề…
        </p>
      ) : (
        <>
          {items.length >= LIBRARY_LIST_LIMIT && (
            <p className={hint}>Đang hiện {LIBRARY_LIST_LIMIT} đề sửa gần nhất; đề cũ hơn không có trong danh sách.</p>
          )}
          <LibraryList
            items={items}
            busyId={busyId}
            onNew={(kind) => setEditing({ item: emptyItem(newId(), kind), saved: null })}
            onEdit={(item) => setEditing({ item, saved: item })}
            onDuplicate={duplicate}
            onDelete={remove}
          />
        </>
      )}
    </div>
  );
}
