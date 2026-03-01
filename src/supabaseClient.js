import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://qxozqgpuzthemsfotmvo.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b3pxZ3B1enRoZW1zZm90bXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzg2NTUsImV4cCI6MjA4NjI1NDY1NX0.N_10hGPsTjO4aH5DkqVd3EkE14QLpuOQoENgff0uTbE'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)