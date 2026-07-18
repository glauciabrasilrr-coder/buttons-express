import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://smoziopohwubskxlgwbv.supabase.co';

const supabaseAnonKey =
  'sb_publishable_2gMtZV8kE9iWgXOWWwBT0g_AXreKilT';

/**
 * Cliente principal:
 * mantém a sessão administrativa do painel.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

/**
 * Cliente público do Portal do Cliente:
 * não reutiliza nem persiste a sessão administrativa.
 *
 * Isso evita que, no mesmo navegador, o login da rota /fila
 * altere o papel usado pelo upload das fotos.
 */
export const supabasePublic = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);