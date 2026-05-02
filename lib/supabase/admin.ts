import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Admin com Service Role Key.
 * USE COM CUIDADO — ignora RLS (Row Level Security).
 * Apenas em server actions, API routes ou scripts.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
