import { createClient } from '@supabase/supabase-js'

// Try with different region suffixes
const supabaseUrl = 'https://gzurjjuhfjbcafmfdaog.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dXJqanVoZmpiY2FmbWZkYW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTc0MzYsImV4cCI6MjA3MTUzMzQzNn0.TNxptO4TvX4MNtoDKeO50PpOvCX4szZJhPQonKiTAAE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
