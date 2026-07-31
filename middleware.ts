import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // if the request is for the dashboard page, check for the session cookie
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // check for the session cookie (here 'admin_session' is the cookie name)
    const session = request.cookies.get('admin_session');

    // if the cookie is not present, redirect the user to the login page
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// specify which pages this middleware should run on
export const config = {
  matcher: '/dashboard/:path*',
};
