import { NextRequest, NextResponse } from 'next/server';
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-token';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Login page and auth endpoint are always open.
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin-auth')) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? '';
  const email    = process.env.ADMIN_EMAIL    ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  const secret   = process.env.ADMIN_SECRET   ?? '';

  const expected = await computeAdminToken(email, password, secret);

  if (cookie !== expected) {
    // API callers get 401; page requests get redirected to login.
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const login = req.nextUrl.clone();
    login.pathname = '/admin/login';
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}
