import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_REQUEST_TIMEOUT_MS = 12000;
const SUPABASE_AUTH_LOCK_TIMEOUT_MS = 15000;
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
let currentAccessToken: string | null = null;

function readStoredSession(): any | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(authStorageKey);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function readStoredAccessToken(): string | null {
    const session = readStoredSession();
    return typeof session?.access_token === 'string' ? session.access_token : null;
}

function readStoredUser(): any | null {
    const session = readStoredSession();
    return session?.user ?? null;
}

export function getCachedSession(): any | null {
    return readStoredSession();
}

async function getDataAccessToken(): Promise<string | null> {
    currentAccessToken = currentAccessToken ?? readStoredAccessToken();
    return currentAccessToken;
}

function createTimeoutError(ms: number): Error {
    return new Error(`Yêu cầu quá thời gian phản hồi (${Math.round(ms / 1000)}s). Vui lòng thử lại.`);
}

const fetchWithTimeout: typeof fetch = async (input, init: RequestInit = {}) => {
    const controller = new AbortController();
    const upstreamSignal = init.signal;
    let timedOut = false;

    const abortFromUpstream = () => controller.abort();
    if (upstreamSignal?.aborted) {
        controller.abort();
    } else {
        upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });
    }

    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, SUPABASE_REQUEST_TIMEOUT_MS);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } catch (error) {
        if (timedOut) {
            throw createTimeoutError(SUPABASE_REQUEST_TIMEOUT_MS);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        upstreamSignal?.removeEventListener('abort', abortFromUpstream);
    }
};

// Auth client: uses NATIVE fetch (no timeout) to prevent aborting token
// refresh requests that would burn refresh tokens on tab switch/resume.
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: authStorageKey,
        lockAcquireTimeout: SUPABASE_AUTH_LOCK_TIMEOUT_MS,
    } as any,
});

const supabaseData = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: fetchWithTimeout,
    },
    accessToken: getDataAccessToken,
});

supabaseAuth.auth.onAuthStateChange((_event, session) => {
    currentAccessToken = session?.access_token ?? readStoredAccessToken();
});

export const supabase = Object.assign(supabaseAuth, {
    from: supabaseData.from.bind(supabaseData),
    rpc: supabaseData.rpc.bind(supabaseData),
});

/**
 * Call when the page becomes visible (tab refocused) to ensure the SDK
 * proactively refreshes the session token without relying on timers that
 * may have been throttled while the tab was in the background.
 */
export function resumeAuthRefresh(): void {
    supabaseAuth.auth.startAutoRefresh();
}

/**
 * Call when the page becomes hidden (tab loses focus) to stop background
 * auto-refresh attempts that would be throttled by the browser anyway.
 */
export function pauseAuthRefresh(): void {
    supabaseAuth.auth.stopAutoRefresh();
}

// --- Auth helpers ---

export const signUp = async (email: string, password: string, username: string, displayName: string) => {
    // 1. Create auth user
    const { data: authData, error: authError } = await withTimeout(supabase.auth.signUp({
        email,
        password,
    }));

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');
    currentAccessToken = authData.session?.access_token ?? readStoredAccessToken();

    // 2. Create profile
    const { error: profileError } = await withTimeout(Promise.resolve(supabase
        .from('profiles')
        .insert({
            id: authData.user.id,
            username,
            display_name: displayName,
        })));

    if (profileError) throw profileError;

    return authData;
};

export const signIn = async (email: string, password: string) => {
    const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
        email,
        password,
    }));

    if (error) throw error;
    currentAccessToken = data.session?.access_token ?? readStoredAccessToken();
    return data;
};

export const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
        },
    });

    if (error) throw error;
    return data;
};

export const signInWithGithub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: window.location.origin,
        },
    });

    if (error) throw error;
    return data;
};

export const signOut = async () => {
    currentAccessToken = null;
    const { error } = await withTimeout(supabase.auth.signOut());
    if (error) throw error;
};

export const getProfile = async (userId: string) => {
    const { data, error } = await withTimeout(Promise.resolve(supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()));

    if (error && error.code === 'PGRST116') {
        // Profile not found — create one for OAuth users
        let user = readStoredUser();
        if (!user) {
            const { data } = await withTimeout(supabase.auth.getUser(), 5000);
            user = data.user;
        }
        if (!user) throw new Error('User not found');

        const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const username = user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;

        const { data: newProfile, error: insertError } = await withTimeout(Promise.resolve(supabase
            .from('profiles')
            .insert({
                id: userId,
                username: username,
                display_name: displayName,
            })
            .select()
            .single()));

        if (insertError) throw insertError;
        return newProfile as { id: string; username: string; display_name: string; created_at: string };
    }

    if (error) throw error;
    return data as { id: string; username: string; display_name: string; created_at: string };
};

// --- Learning History helpers ---

export interface LearningRecord {
    id: string;
    user_id: string;
    topic: string;
    level: string;
    words: string;
    quiz_score: number | null;
    quiz_total: number | null;
    lesson_data: any | null;
    completed_at: string;
}

export const saveLearningRecord = async (record: {
    id?: string;
    user_id: string;
    topic: string;
    level: string;
    words: string;
    quiz_score: number;
    quiz_total: number;
    lesson_data?: any;
}) => {
    const payload: any = {
        user_id: record.user_id,
        topic: record.topic,
        level: record.level,
        words: record.words,
        quiz_score: record.quiz_score,
        quiz_total: record.quiz_total,
        lesson_data: record.lesson_data,
    };

    let query;
    if (record.id) {
        query = supabase
            .from('learning_history')
            .update(payload)
            .eq('id', record.id)
            .select()
            .single();
    } else {
        query = supabase
            .from('learning_history')
            .insert(payload)
            .select()
            .single();
    }

    const { data, error } = await withTimeout(Promise.resolve(query));

    if (error) {
        console.error('saveLearningRecord error:', error);
        throw new Error(error.message || 'Lỗi khi lưu bài học');
    }
    return data as LearningRecord;
};

export const getLearningHistory = async (userId: string): Promise<LearningRecord[]> => {
    const { data, error } = await withTimeout(Promise.resolve(supabase
        .from('learning_history')
        .select('id, user_id, topic, level, words, quiz_score, quiz_total, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })));

    if (error) throw error;
    return (data || []).map((row: any) => ({
        ...row,
        lesson_data: null,
    })) as LearningRecord[];
};

export const getLessonAudio = async (recordId: string): Promise<string | null> => {
    try {
        const { data, error } = await withTimeout(Promise.resolve(supabase
            .from('lesson_audio')
            .select('audio_base64')
            .eq('record_id', recordId)
            .maybeSingle()));

        if (error) {
            console.warn('getLessonAudio returned error (could be missing migration):', error);
            return null;
        }
        return data ? data.audio_base64 : null;
    } catch (e) {
        console.error('Failed to fetch lesson audio:', e);
        return null;
    }
};

export const saveLessonAudio = async (recordId: string, audioBase64: string): Promise<boolean> => {
    try {
        const { error } = await withTimeout(Promise.resolve(supabase
            .from('lesson_audio')
            .upsert(
                { record_id: recordId, audio_base64: audioBase64 },
                { onConflict: 'record_id' }
            )));

        if (error) {
            console.warn('saveLessonAudio returned error (could be missing migration):', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Failed to save lesson audio:', e);
        return false;
    }
};

export const getLearningRecordFull = async (recordId: string): Promise<LearningRecord | null> => {
    const { data, error } = await withTimeout(Promise.resolve(supabase
        .from('learning_history')
        .select('*')
        .eq('id', recordId)
        .single()));

    if (error) throw error;

    if (data && data.lesson_data) {
        try {
            const audio = await getLessonAudio(recordId);
            if (audio && data.lesson_data.story) {
                data.lesson_data.story.audioBase64 = audio;
            }
        } catch (audioErr) {
            console.warn('Could not load audio for lesson record:', audioErr);
        }
    }
    return data as LearningRecord | null;
};

export const deleteLearningRecord = async (recordId: string) => {
    const { error } = await withTimeout(Promise.resolve(supabase
        .from('learning_history')
        .delete()
        .eq('id', recordId)));

    if (error) throw error;
};

/**
 * Wrap a promise with a maximum execution timeout.
 * Prevents network calls from hanging indefinitely (e.g. after sleep/resume).
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number = SUPABASE_REQUEST_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const operation = Promise.resolve(promise);
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError(ms)), ms);
  });

  return Promise.race([operation, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}
