import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gymprqskzmxpwrlrvndl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5bXBycXNrem14cHdybHJ2bmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4OTYzMzUsImV4cCI6MjEwMDQ3MjMzNX0.jgM3jmBf3JXDYLjWVEOtiDyDx27pDv6tSieoSFKEc4U'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  const { data, error } = await supabase
    .from('learning_cases')
    .select('id,nickname,completed_date,scenario_title,practice_type,outcome,collision_count,learning_points')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('ERROR WITHOUT NEW COLUMNS:', JSON.stringify(error, null, 2))
  } else {
    console.log('SUCCESS, count:', data?.length)
  }
}

test()
