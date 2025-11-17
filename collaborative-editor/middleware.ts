import { NextRequest, NextResponse } from 'next/server';
import { appwrite } from './lib/appwrite/config';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth routes that should redirect authenticated users
  const authRoutes = ['/login', '/signup'];
  // Protected routes that require authentication
  const protectedRoutes = ['/app'];

  try {
    // Check if user is authenticated
    const user = await appwrite.account.get();

    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (user && authRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/app', request.url));
    }

    // If user is not authenticated and trying to access protected routes, redirect to landing
    if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Allow access to landing page for all users
    // Authenticated users can access landing page but might see a different version

    return NextResponse.next();
  } catch (error) {
    // User is not authenticated
    // If trying to access protected routes, redirect to landing page
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }
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