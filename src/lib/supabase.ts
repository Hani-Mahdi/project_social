import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_KEY || '').trim()

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Please check your .env file and ensure ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_KEY are properly set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)





