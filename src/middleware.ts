import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "supersecretdevelopmentkeyagentshield12345",
  });

  const { pathname } = req.nextUrl;

  // 1. Redirect authenticated users away from auth pages (login, register)
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 2. Protect Dashboard paths
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      // Remember where the user was trying to go
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Protect Admin console paths specifically
    if (pathname.startsWith('/dashboard/admin') && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Catch all pages except assets, static folders and icons
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};
