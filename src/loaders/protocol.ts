import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
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
