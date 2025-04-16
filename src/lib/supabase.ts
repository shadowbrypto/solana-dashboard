import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kctohdlzcnnmcubgxiaa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDcxNjg2NiwiZXhwIjoyMDYwMjkyODY2fQ.hSiPxdY28riZfuXnpZqIFun2wRmqa0a371xuiDtJr8I";

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
