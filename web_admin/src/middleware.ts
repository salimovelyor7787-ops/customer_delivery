import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const authRoutes = ["/admin", "/restaurant", "/courier"];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isProtected = authRoutes.some((route) => pathname.startsWith(route));

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getSession();

  if (isProtected && !data.session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && data.session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();

    const role = profile?.role;
    const url = request.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : role === "restaurant" ? "/restaurant" : "/courier";
    return NextResponse.redirect(url);
  }

  if (isProtected && data.session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();
    const role = profile?.role;
    if (
      (pathname.startsWith("/admin") && role !== "admin") ||
      (pathname.startsWith("/restaurant") && role !== "restaurant") ||
      (pathname.startsWith("/courier") && role !== "courier")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/admin" : role === "restaurant" ? "/restaurant" : "/courier";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/restaurant/:path*", "/courier/:path*", "/login"],
};
