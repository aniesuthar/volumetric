"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const [token, setToken] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string>("")

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setToken(resolvedParams.token)
      await checkAuth(resolvedParams.token)
    }
    init()
  }, [])

  const checkAuth = async (inviteToken: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to sign in, then come back
      alert("Please sign in to accept this invitation")
      router.push("/")
      return
    }

    await acceptInvite(inviteToken)
  }

  const acceptInvite = async (inviteToken: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/teams/accept-invite/${inviteToken}`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTeamName(data.team?.name || "the team")
        setTimeout(() => {
          router.push("/teams")
        }, 2000)
      } else {
        setError(data.error || "Failed to accept invitation")
      }
    } catch (err) {
      setError("Failed to accept invitation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>Accept your invitation to join a team</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Processing invitation...</p>
            </div>
          )}

          {!loading && success && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Welcome to {teamName}!</h3>
              <p className="text-muted-foreground mb-4">You have successfully joined the team.</p>
              <Button onClick={() => router.push("/teams")}>Go to Teams</Button>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Invitation Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={() => router.push("/teams")}>
                Go to Teams
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
