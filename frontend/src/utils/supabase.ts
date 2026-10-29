import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://cdidxtqahszehqhfepyg.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaWR4dHFhaHN6ZWhxaGZlcHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNTQ0MjksImV4cCI6MjEwODgzMDQyOX0.LSQruRydRCfbEYQa2jsBTggoA-ShI6Tvn7yIxBzsm48';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
