import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Public routes that don't require authentication
const publicRoutes = [
    '/',
    'volumetric',
    '/profit',
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
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Allow all API routes - they handle their own auth
    const isApiRoute = pathname.startsWith('/api/')

    // Check if route is public
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    )

    if (isPublicRoute || isApiRoute) {
        // If user is already authenticated and trying to access auth pages, redirect to home
        if (authPages.some(route => pathname.startsWith(route))) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                return NextResponse.redirect(new URL('/', request.url))
            }
        }
        return response
    }

    // For protected routes, check authentication
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        // User not authenticated, redirect to signin with return URL
        const redirectUrl = new URL('/auth/signin', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // User is authenticated, allow access
    return response
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
