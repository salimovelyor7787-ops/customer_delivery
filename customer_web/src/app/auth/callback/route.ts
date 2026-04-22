import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { pathAfterAuth } from "@/lib/auth-redirect";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : pathAfterAuth();
  const loginUrl = `${url.origin}/login`;

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${loginUrl}?error=config`);
  }

  const redirectResponse = NextResponse.redirect(`${url.origin}${nextPath}`);
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${loginUrl}?error=oauth`);
  }

  return redirectResponse;
}
