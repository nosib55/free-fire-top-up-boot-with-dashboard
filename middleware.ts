import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('admin_session')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  // 1. Guard /admin routes: strictly for authenticated admin users
  if (pathname.startsWith('/admin') || pathname.startsWith('/adminDashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/userDashboard', request.url));
    }
  }

  // 2. Guard /userDashboard & /dashboard routes: requires authentication
  if (pathname.startsWith('/userDashboard') || pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/adminDashboard/:path*',
    '/userDashboard/:path*',
    '/dashboard/:path*',
  ],
};
