"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Loader2, CheckCircle, Home } from "lucide-react"

export default function SignOutPage() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(true)
  const [signedOut, setSignedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const signOut = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { error } = await supabase.auth.signOut()

        if (error) {
          console.error("Sign out error:", error)
          setError("Failed to sign out. Please try again.")
        } else {
          setSignedOut(true)
          // Clear any stored invitation redirects
          localStorage.removeItem('invitationRedirect')

          // Redirect to home after a brief delay
          setTimeout(() => {
            router.push('/')
          }, 2000)
        }
      } catch (err) {
        console.error("Sign out error:", err)
        setError("Failed to sign out. Please try again.")
      } finally {
        setIsSigningOut(false)
      }
    }

    signOut()
  }, [router])

  if (isSigningOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-bold mb-2">Signing Out</h2>
              <p className="text-gray-600">Please wait...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <LogOut className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Sign Out Failed</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (signedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Signed Out Successfully</h2>
              <p className="text-gray-600 mb-4">You have been signed out of your account.</p>
              <p className="text-sm text-gray-500 mb-4">Redirecting to home page...</p>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}