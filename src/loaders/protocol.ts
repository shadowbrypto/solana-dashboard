import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
const supabase = createClient(
  "https://kctohdlzcnnmcubgxiaa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDcxNjg2NiwiZXhwIjoyMDYwMjkyODY2fQ.hSiPxdY28riZfuXnpZqIFun2wRmqa0a371xuiDtJr8I"
);

export async function queryProtocolData(protocol = "bullx") {
  try {
    const { data } = await supabase
      .from("protocol_stats")
      .select()
      .eq("protocol_name", protocol);
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}
