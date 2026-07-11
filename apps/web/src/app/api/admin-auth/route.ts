import { NextRequest, NextResponse } from 'next/server';
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-token';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { email, password } = await req.json() as { email?: string; password?: string };

  const validEmail    = process.env.ADMIN_EMAIL    ?? '';
  const validPassword = process.env.ADMIN_PASSWORD ?? '';
  const secret        = process.env.ADMIN_SECRET   ?? '';

  if (!email || !password || email !== validEmail || password !== validPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await computeAdminToken(email, password, secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   60 * 60 * 8, // 8 hours
    path:     '/',
  });
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
