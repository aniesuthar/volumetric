"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building, Crown, Shield, Users, Eye, CheckCircle, XCircle, Loader2 } from "lucide-react"

type InvitationData = {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  team: {
    id: string
    name: string
  }
}

type CurrentUser = {
  id: string
  email: string
  isCorrectEmail: boolean
} | null

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link")
      setLoading(false)
      return
    }

    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      const response = await fetch(`/api/teams/accept-invitation?token=${token}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to load invitation")
      }

      const data = await response.json()
      setInvitation(data.invitation)
      setCurrentUser(data.currentUser)
    } catch (error: any) {
      console.error("Load invitation error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const signInAndRedirect = () => {
    // Store the invitation URL to redirect back after sign-in
    if (typeof window !== 'undefined') {
      localStorage.setItem('invitationRedirect', window.location.href)
    }
    router.push('/auth/signin')
  }

  const acceptInvitation = async () => {
    if (!token) return

    setAccepting(true)
    try {
      const response = await fetch('/api/teams/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to accept invitation")
      }

      const data = await response.json()
      setSuccess(true)

      // Clear any stored redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('invitationRedirect')
      }

      // Redirect to team page after a short delay
      setTimeout(() => {
        router.push(`/teams/${data.team.id}`)
      }, 2000)
    } catch (error: any) {
      console.error("Accept invitation error:", error)
      setError(error.message)
    } finally {
      setAccepting(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />
      case "admin":
        return <Shield className="h-4 w-4" />
      case "viewer":
        return <Eye className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case "owner":
        return "default"
      case "admin":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "owner":
        return "Full control over the team, including managing members and settings"
      case "admin":
        return "Can manage team members and invite new people"
      case "member":
        return "Can create, edit, and collaborate on team materials"
      case "viewer":
        return "Can view team materials and stay updated with activities"
      default:
        return "Access to team features based on assigned role"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading invitation...</p>
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
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Go to Home
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Welcome to the team!</h2>
              <p className="text-gray-600 mb-4">
                You've successfully joined <strong>{invitation?.team.name}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to team page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Invitation Not Found</h2>
              <p className="text-gray-600 mb-4">
                This invitation link is invalid or has expired.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Go to Home
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Join <strong>{invitation.team.name}</strong> team
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              You've been invited to join <strong>{invitation.team.name}</strong> as a:
            </p>

            <Badge
              variant={getRoleBadgeVariant(invitation.role)}
              className="text-lg px-4 py-2"
            >
              {getRoleIcon(invitation.role)}
              <span className="ml-2 capitalize">{invitation.role}</span>
            </Badge>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">What you can do:</h4>
            <p className="text-sm text-gray-600">
              {getRoleDescription(invitation.role)}
            </p>
          </div>

          <div className="text-center space-y-3">
            {!currentUser ? (
              // User not signed in - show sign in options
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Sign in required:</strong> Please sign in with <strong>{invitation.email}</strong> to accept this invitation.
                  </p>
                </div>

                <button
                  onClick={signInAndRedirect}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 font-medium"
                >
                  <CheckCircle className="h-4 w-4" />
                  Sign In to Accept Invitation
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Don't have an account?</p>
                  <button
                    onClick={() => {
                      // Store invitation data for after signup
                      if (typeof window !== 'undefined' && token) {
                        localStorage.setItem('pendingInvitation', token)
                        localStorage.setItem('invitationEmail', invitation.email)
                      }
                      router.push(`/auth/signup?email=${encodeURIComponent(invitation.email)}&redirect=${encodeURIComponent(`/teams/accept-invitation?token=${token}`)}`)
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Create account with {invitation.email}
                  </button>
                </div>
              </>
            ) : currentUser.isCorrectEmail ? (
              // User signed in with correct email
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    ✓ You're signed in as <strong>{currentUser.email}</strong>
                  </p>
                </div>

                <button
                  onClick={acceptInvitation}
                  disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Accept Invitation
                    </>
                  )}
                </button>
              </>
            ) : (
              // User signed in with wrong email
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-orange-800 mb-2">
                    <strong>Wrong account:</strong> You're signed in as <strong>{currentUser.email}</strong>, but this invitation is for <strong>{invitation.email}</strong>.
                  </p>
                </div>

                <button
                  onClick={() => router.push('/auth/signout')}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 font-medium"
                >
                  Sign Out & Use Correct Account
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Or{' '}
                    <button
                      onClick={signInAndRedirect}
                      className="text-primary hover:underline font-medium"
                    >
                      sign in with {invitation.email}
                    </button>
                  </p>
                </div>
              </>
            )}

            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Maybe Later
            </button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>
              Invited to: <strong>{invitation.email}</strong>
            </p>
            <p>
              Invitation sent: {new Date(invitation.created_at).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}