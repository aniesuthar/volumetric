import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Require authentication for a server component or route
 * Redirects to login if user is not authenticated
 */
export async function requireAuth(redirectTo?: string) {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        const loginUrl = redirectTo
            ? `/auth/signin?redirect=${encodeURIComponent(redirectTo)}`
            : '/auth/signin'
        redirect(loginUrl)
    }

    return { user, supabase }
}

/**
 * Get the authenticated user or return null
 * Does not redirect, useful for optional auth
 */
export async function getAuthenticatedUser() {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    return { user, supabase }
}

/**
 * Check if user is authenticated (boolean)
 */
export async function isAuthenticated(): Promise<boolean> {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    return !error && !!user
}
