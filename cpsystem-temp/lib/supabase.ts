import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Robust check for configuration
export const isSupabaseConfigured = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseUrl.trim() !== '' &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey !== 'placeholder' &&
  supabaseAnonKey.trim() !== '';

if (!isSupabaseConfigured) {
  const reason = !supabaseUrl.startsWith('https://') ? 'URL deve começar com https://' : 'Credenciais faltando ou padrão';
  console.warn(`Supabase status: ${reason}. URL: ${supabaseUrl.substring(0, 15)}...`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
