import { NextRequest, NextResponse } from 'next/server';
import { appwrite } from './lib/appwrite/config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth routes that should redirect authenticated users (handled client-side)
  const authRoutes = ['/login', '/signup'];
  const protectedRoutes = ['/app', '/dashboard'];

  console.log('Middleware - Path:', pathname, 'ALLOWING ACCESS');

  // Only redirect from auth routes if we can detect authentication
  // For now, let client-side handle all auth routing
  if (authRoutes.some(route => pathname.startsWith(route))) {
    console.log('Allowing access to auth route, client-side will handle redirect');
    return NextResponse.next();
  }

  // Allow access to protected routes - client-side AuthContext will handle protection
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    console.log('Allowing access to protected route, client-side will handle auth');
    return NextResponse.next();
  }

  // Allow access to all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};