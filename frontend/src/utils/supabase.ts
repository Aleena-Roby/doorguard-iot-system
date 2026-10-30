import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://xpfocqbtenuhifbhtyia.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZm9jcWJ0ZW51aGlmYmh0eWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMzA4MjMsImV4cCI6MjEwODkwNjgyM30.8-VH7rNA9VcVnaLMdVtO3dlsOhXzk_lVWSqh1-Ub-gI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
