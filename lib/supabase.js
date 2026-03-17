import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tdlfdbtxmtuthfzylusg.supabase.co'
const SUPABASE_KEY = 'sb_publishable_WHF4FP4WjpJlfKNbmskmkg_-Lt85Gsw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
