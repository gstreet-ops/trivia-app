import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qxozqgpuzthemsfotmvo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b3pxZ3B1enRoZW1zZm90bXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzg2NTUsImV4cCI6MjA4NjI1NDY1NX0.N_10hGPsTjO4aH5DkqVd3EkE14QLpuOQoENgff0uTbE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)