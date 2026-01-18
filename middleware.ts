import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// Public routes that don't require authentication
const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/callback',
    '/auth/error',
    '/teams/accept-invitation',
]

// Routes that should redirect to home if already authenticated
const authPages = ['/auth/signin', '/auth/signup']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
        // If user is already authenticated and trying to access auth pages, redirect to home
        if (authPages.some(route => pathname.startsWith(route))) {
            const supabase = await getSupabaseServerClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                return NextResponse.redirect(new URL('/', request.url))
            }
        }
        return NextResponse.next()
    }

    // For all other routes, check authentication
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        // User not authenticated, redirect to signin with return URL
        const redirectUrl = new URL('/auth/signin', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // User is authenticated, allow access
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
