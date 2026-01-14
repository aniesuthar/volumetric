"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User,
  Users,
  Mail,
  Calendar,
  Shield,
  Building,
  Package,
  Crown,
  Eye,
  Plus
} from "lucide-react"

export function SimpleAccountDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        console.log("Initializing account dashboard...")
        const supabase = getSupabaseBrowserClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log("User data:", user, "Error:", userError)

        if (userError || !user) {
          console.log("No authenticated user, redirecting to sign in")
          router.push("/auth/signin?redirectTo=/account")
          return
        }

        setUser(user)

        // Try to load teams
        try {
          const response = await fetch("/api/teams")
          console.log("Teams response status:", response.status)

          if (response.ok) {
            const data = await response.json()
            console.log("Teams data:", data)
            if (data.teams) {
              setTeams(data.teams)
            }
          } else {
            console.log("Teams API failed, but continuing...")
          }
        } catch (teamError) {
          console.log("Teams error (non-critical):", teamError)
        }

        setLoading(false)
      } catch (e: any) {
        console.error("Account init error:", e)
        setError("Failed to initialize account")
        setLoading(false)
      }
    }

    init()
  }, [])

  const loadTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      console.log("Teams response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Teams data:", data)
        if (data.teams) {
          setTeams(data.teams)
        }
      } else {
        console.log("Teams API failed")
      }
    } catch (teamError) {
      console.log("Teams error:", teamError)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim()) return
    setCreatingTeam(true)
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      })
      const data = await response.json()
      if (response.ok && data.team) {
        setNewTeamName("")
        await loadTeams() // Reload teams
        console.log("Team created successfully")
      } else {
        console.error("Failed to create team:", data.error)
        alert(data.error || "Failed to create team")
      }
    } catch (error) {
      console.error("Create team error:", error)
      alert("Failed to create team")
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3" />
      case "admin":
        return <Shield className="h-3 w-3" />
      case "viewer":
        return <Eye className="h-3 w-3" />
      default:
        return <Users className="h-3 w-3" />
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

  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "U"
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading account...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Redirecting to sign in...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center text-2xl font-bold">
                  {getInitials(user?.email)}
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">{user?.email}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {user?.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Joined {new Date(user?.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Quick Stats */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{teams.length}</p>
                    <p className="text-xs text-muted-foreground">Teams</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">Materials</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                <a
                  href="/estimate"
                  className="w-full inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 no-underline"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Materials Calculator
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Sign Out
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Teams you belong to and your role in each</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Create Team Form */}
              <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-3">Create New Team</h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="team-name" className="sr-only">Team Name</Label>
                    <Input
                      id="team-name"
                      placeholder="Enter team name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      disabled={creatingTeam}
                    />
                  </div>
                  <button
                    onClick={createTeam}
                    disabled={creatingTeam || !newTeamName.trim()}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    {creatingTeam ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </>
                    )}
                  </button>
                </div>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">You're not part of any teams yet</p>
                  <p className="text-sm text-muted-foreground">Create your first team above to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team: any) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{team.teams?.name || "Unknown Team"}</h4>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(team.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(team.role)} className="flex items-center gap-1">
                          {getRoleIcon(team.role)}
                          {team.role}
                        </Badge>
                        <a
                          href={`/teams/${team.teams?.id}`}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Manage
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}