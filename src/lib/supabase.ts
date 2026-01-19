import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_KEY || '').trim()

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)





