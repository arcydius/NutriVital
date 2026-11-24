import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !supabaseUrl.includes('TU-PROYECTO') &&
  !supabaseAnonKey.includes('TU_SUPABASE');

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
