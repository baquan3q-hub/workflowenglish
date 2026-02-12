import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

// --- Auth helpers ---

export const signUp = async (email: string, password: string, username: string, displayName: string) => {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    // 2. Create profile
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: authData.user.id,
            username,
            display_name: displayName,
        });

    if (profileError) throw profileError;

    return authData;
};

export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

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
    const { data, error } = await supabase
        .from('learning_history')
        .upsert(record)
        .select()
        .single();

    if (error) throw error;
    return data as LearningRecord;
};

export const getLearningHistory = async (userId: string): Promise<LearningRecord[]> => {
    const { data, error } = await supabase
        .from('learning_history')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

    if (error) throw error;
    return (data || []) as LearningRecord[];
};

export const deleteLearningRecord = async (recordId: string) => {
    const { error } = await supabase
        .from('learning_history')
        .delete()
        .eq('id', recordId);

    if (error) throw error;
};
