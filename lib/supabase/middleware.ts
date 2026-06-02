import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isPlaceholder = 
    !supabaseUrl || 
    supabaseUrl.includes('your-project-id') || 
    !supabaseAnonKey || 
    supabaseAnonKey.includes('eyJhbGciOiJIUzI1NiInR5cCI6IkpXVCJ9');

  const url = !isPlaceholder ? supabaseUrl! : 'https://placeholder-project.supabase.co';
  const key = !isPlaceholder ? supabaseAnonKey! : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.key';

  // Demo mode check for local-only visual evaluations
  const demoCookie = request.cookies.get('rentacore_demo_active')?.value;
  const isDemoAuthenticated = demoCookie === 'true';

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // Verify authentication state
  let user = null;
  if (!isPlaceholder) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch (e) {
      // Ignore auth errors during initialization
    }
  }

  const isPageAdmin = request.nextUrl.pathname.startsWith('/dashboard');
  const isPageLogin = request.nextUrl.pathname.startsWith('/login');

  // If trying to access dashboard pages and has no session + no demo authentication, redirect to login
  if (isPageAdmin && !user && !isDemoAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    if (isPlaceholder) {
      loginUrl.searchParams.set('demo_mode', 'true');
    }
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in / demo authenticated and tries to hit /login, redirect to /dashboard
  if (isPageLogin && (user || isDemoAuthenticated)) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
