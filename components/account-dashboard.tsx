"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Users,
  Mail,
  Calendar,
  Shield,
  Building,
  Package,
  ChevronRight,
  Crown,
  Eye
} from "lucide-react"

type Team = {
  id: string
  name: string
  role: "owner" | "admin" | "member" | "viewer"
  joined_at: string
  teams: {
    id: string
    name: string
    created_at: string
  }
}

type MaterialStats = {
  personal: number
  team: number
}

export function AccountDashboard() {
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [materialStats, setMaterialStats] = useState<MaterialStats>({ personal: 0, team: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUser(user)
      await Promise.all([
        loadTeams(),
        loadMaterialStats(user.id)
      ])
      setLoading(false)
    }
    init()
  }, [])

  const loadTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      const data = await response.json()
      if (data.teams) {
        setTeams(data.teams)
      }
    } catch (error) {
      console.error("Failed to load teams:", error)
    }
  }

  const loadMaterialStats = async (userId: string) => {
    try {
      const supabase = getSupabaseBrowserClient()

      // Count personal materials
      const { count: personalCount } = await supabase
        .from("materials")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("team_id", null)

      // Count team materials (materials in teams user belongs to)
      const { count: teamCount } = await supabase
        .from("materials")
        .select("*", { count: "exact", head: true })
        .not("team_id", "is", null)

      setMaterialStats({
        personal: personalCount || 0,
        team: teamCount || 0
      })
    } catch (error) {
      console.error("Failed to load material stats:", error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
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
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sign in to view your account</h3>
          <p className="text-muted-foreground">You need to be signed in to access account features.</p>
        </div>
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
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl">
                    {getInitials(user?.email)}
                  </AvatarFallback>
                </Avatar>
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
                    <p className="text-2xl font-bold">{materialStats.personal + materialStats.team}</p>
                    <p className="text-xs text-muted-foreground">Total Materials</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                <button
                  onClick={() => window.location.href = "/estimate"}
                  className="w-full inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Materials Calculator
                </button>
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
          <Tabs defaultValue="teams" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Your Teams</CardTitle>
                      <CardDescription>Teams you belong to and your role in each</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {teams.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-4">You're not part of any teams yet</p>
                      <p className="text-sm text-muted-foreground">Teams will appear here once you join or create one in the materials calculator.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{team.teams.name}</h4>
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Materials Overview</CardTitle>
                      <CardDescription>Your personal and team materials catalog</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="text-2xl font-bold">{materialStats.personal}</span>
                        </div>
                        <h4 className="font-medium mb-1">Personal Materials</h4>
                        <p className="text-sm text-muted-foreground">
                          Materials in your personal catalog
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="text-2xl font-bold">{materialStats.team}</span>
                        </div>
                        <h4 className="font-medium mb-1">Team Materials</h4>
                        <p className="text-sm text-muted-foreground">
                          Materials shared with your teams
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Materials by Team */}
                  {teams.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Catalog Access by Team</h4>
                      <div className="space-y-2">
                        {teams.map((team) => (
                          <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{team.teams.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {team.role === "viewer" ? "View Only" :
                                 team.role === "member" ? "Can Edit" :
                                 team.role === "admin" ? "Full Control" :
                                 "Owner"}
                              </span>
                              <Badge variant={getRoleBadgeVariant(team.role)} className="text-xs">
                                {team.role}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account preferences and security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email Address</p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Account Created</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(user?.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="pt-4">
                    <button
                      onClick={handleSignOut}
                      className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-10 px-4 py-2"
                    >
                      Sign Out
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}