import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://yukbvfihnimiffrjxkfk.supabase.co'
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1a2J2ZmlobmltaWZmcmp4a2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDk4MDQsImV4cCI6MjA5NTQyNTgwNH0.DYE3MDOT4vJlVAm5EdeYhVRWEyfRs7nH7L2i7jc1MbQ"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
