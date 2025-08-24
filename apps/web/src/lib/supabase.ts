import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using service role key
export const supabaseServer = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only
  
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(url, key, { 
    auth: { persistSession: false },
    db: { schema: 'core' } // Default to core schema
  });
};

// Client-side Supabase client (if needed for real-time features)
export const supabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(url, key);
};
