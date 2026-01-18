import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorCode = requestUrl.searchParams.get("error_code")
  const errorDescription = requestUrl.searchParams.get("error_description")
  const origin = requestUrl.origin

  // Handle authentication errors
  if (error || errorCode) {
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', error || 'unknown_error')
    errorUrl.searchParams.set('error_code', errorCode || 'unknown')
    errorUrl.searchParams.set('message', errorDescription || 'An authentication error occurred')
    return NextResponse.redirect(errorUrl)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch { }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: "", ...options })
            } catch { }
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      const errorUrl = new URL('/auth/error', origin)
      errorUrl.searchParams.set('error', 'exchange_failed')
      errorUrl.searchParams.set('message', exchangeError.message)
      return NextResponse.redirect(errorUrl)
    }
  }

  // Check for pending invitation and redirect accordingly
  const pendingInvitation = requestUrl.searchParams.get('redirect')
  if (pendingInvitation) {
    return NextResponse.redirect(`${origin}${pendingInvitation}`)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}`)
}
