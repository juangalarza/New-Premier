import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fallback to placeholders in development to avoid initial setup crashes
  const url = supabaseUrl && !supabaseUrl.includes('your-project-id') 
    ? supabaseUrl 
    : 'https://placeholder-project.supabase.co';

  const key = supabaseAnonKey && !supabaseAnonKey.includes('eyJhbGciOiJIUzI1NiInR5cCI6IkpXVCJ9') 
    ? supabaseAnonKey 
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.key';

  return createBrowserClient(url, key);
}
export const supabaseBrowser = createClient();
