import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  void request;

  // Simple middleware that allows all routes
  // Authentication will be rebuilt from scratch later

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
