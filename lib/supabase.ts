import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let supabaseServerClient: SupabaseClient | null = null;

const getUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const getAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getSupabase = () => {
    if (!supabaseClient) {
        const url = getUrl();
        const key = getAnonKey();
        if (!url || !key) {
            console.error('Supabase credentials missing');
            // Return a dummy client or handle gracefully to prevent crash if possible, 
            // but the app needs these.
            return null as any; 
        }
        supabaseClient = createClient(url, key);
    }
    return supabaseClient;
};

export const supabase = typeof window !== 'undefined' ? getSupabase() : null as any;

export const getSupabaseServer = () => {
    if (!supabaseServerClient) {
        const url = getUrl();
        const key = getServiceKey() || getAnonKey();
        if (!url || !key) {
            throw new Error('Supabase URL and Key are required');
        }
        supabaseServerClient = createClient(url, key);
    }
    return supabaseServerClient;
};
