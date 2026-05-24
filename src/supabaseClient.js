import { createClient } from '@supabase/supabase-js'

// Try with different region suffixes
const supabaseUrl = 'https://gzurjjuhfjbcafmfdaog.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dXJqanVoZmpiY2FmbWZkYW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTc0MzYsImV4cCI6MjA3MTUzMzQzNn0.TNxptO4TvX4MNtoDKeO50PpOvCX4szZJhPQonKiTAAE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const DEFAULT_PAGE_SIZE = 1000

/** Fetches all rows from a Supabase query (PostgREST default max is 1000 per request). */
export async function fetchAllPages(buildQuery, pageSize = DEFAULT_PAGE_SIZE) {
  const allRows = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break

    allRows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return allRows
}
