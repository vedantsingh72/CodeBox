import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)'
])

const isApiRoute = createRouteMatcher([
  '/api(.*)',
  '/trpc(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (isApiRoute(req) && !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/(.*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
