import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('civora-session');

  let session: any = null;
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      session = JSON.parse(decoded);
      // Check expiry
      if (session.exp && Math.floor(Date.now() / 1000) > session.exp) {
        session = null;
      }
    } catch {
      session = null;
    }
  }

  const role = session?.role;
  const isVolunteerRole = role === 'volunteer' || role === 'worker' || role === 'admin';
  const isApiRoute = pathname.startsWith('/api/');

  // 1. Admin route protection (/admin/... and /api/admin/...)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!session) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'login_required');
      return NextResponse.redirect(url);
    }

    if (role !== 'admin') {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden: Admin access required', code: 'FORBIDDEN' }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  // 2. Volunteer & waste collection route protection (/volunteer/..., /collect/..., /api/volunteer/...)
  if (pathname.startsWith('/volunteer') || pathname.startsWith('/collect') || pathname.startsWith('/api/volunteer')) {
    if (!session) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'login_required');
      return NextResponse.redirect(url);
    }

    if (!isVolunteerRole) {
      // Citizen attempting to access volunteer routes
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden: Volunteer access required', code: 'FORBIDDEN' }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  // 3. Citizen-only reporting routes entered by Volunteers
  if (pathname.startsWith('/report') || pathname.startsWith('/sos') || pathname.startsWith('/exchange')) {
    if (session && (role === 'volunteer' || role === 'worker')) {
      const url = request.nextUrl.clone();
      url.pathname = '/volunteer/dashboard';
      url.searchParams.set('auth', 'citizen_only');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/volunteer/:path*',
    '/collect/:path*',
    '/api/volunteer/:path*',
    '/report/:path*',
    '/sos/:path*',
    '/exchange/:path*',
  ],
};
