import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://smoziopohwubskxlgwbv.supabase.co';

const supabaseAnonKey =
  'sb_publishable_2gMtZV8kE9iWgXOWWwBT0g_AXreKilT';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
);