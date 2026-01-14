"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Users,
  Mail,
  Calendar,
  Shield,
  Crown,
  Eye,
  Plus,
  Settings,
  UserPlus,
  Trash2,
  ArrowLeft,
  Building
} from "lucide-react"

type TeamMember = {
  id: string
  user_id: string
  role: string
  joined_at: string
  email: string
}

type TeamInvitation = {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  invited_by: string
}

type Team = {
  id: string
  name: string
  created_at: string
  created_by: string
}

type TeamManagementProps = {
  teamId: string
}

export function TeamManagement({ teamId }: TeamManagementProps) {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = getSupabaseBrowserClient()

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setError("Please sign in to view team details")
          setLoading(false)
          return
        }
        setCurrentUser(user)

        // Load team details, members, and invitations
        await Promise.all([
          loadTeamDetails(),
          loadTeamMembers(user),
          loadTeamInvitations()
        ])

        setLoading(false)
      } catch (e: any) {
        console.error("Team management init error:", e)
        setError("Failed to load team details")
        setLoading(false)
      }
    }

    init()
  }, [teamId])

  const loadTeamDetails = async () => {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single()

    if (error) {
      throw error
    }
    setTeam(data)
  }

  const loadTeamMembers = async (user?: any) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to load team members")
      }

      const data = await response.json()
      setMembers(data.members || [])
      setCurrentUserRole(data.currentUserRole || "")
    } catch (error: any) {
      console.error("Load team members error:", error)
      throw error
    }
  }

  const loadTeamInvitations = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitations`)
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error loading invitations:", errorData.error)
        return
      }

      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error: any) {
      console.error("Load team invitations error:", error)
    }
  }

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const response = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setInviteEmail("")
        await loadTeamInvitations()
        console.log("Invitation sent successfully")
      } else {
        alert(data.error || "Failed to send invitation")
      }
    } catch (error) {
      console.error("Invite error:", error)
      alert("Failed to send invitation")
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return

    try {
      const response = await fetch(`/api/teams/members/${memberId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadTeamMembers()
        console.log("Member removed successfully")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to remove member")
      }
    } catch (error) {
      console.error("Remove member error:", error)
      alert("Failed to remove member")
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadTeamInvitations()
        console.log("Invitation cancelled successfully")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to cancel invitation")
      }
    } catch (error) {
      console.error("Cancel invitation error:", error)
      alert("Failed to cancel invitation")
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

  const canInviteMembers = currentUserRole === "owner" || currentUserRole === "admin"
  const canRemoveMembers = currentUserRole === "owner" || currentUserRole === "admin"

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading team details...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Go Back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Account
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{team?.name}</h1>
            <p className="text-muted-foreground">
              Created {team?.created_at ? new Date(team.created_at).toLocaleDateString() : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({members.length})</CardTitle>
              <CardDescription>People who have access to this team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center text-sm font-bold">
                        {member.email?.substring(0, 2).toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium">{member.email || "Unknown User"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                      {canRemoveMembers && member.user_id !== currentUser?.id && member.role !== "owner" && (
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
                <CardDescription>Invitations that haven't been accepted yet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Invited {new Date(invitation.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getRoleIcon(invitation.role)}
                          {invitation.role}
                        </Badge>
                        {canInviteMembers && (
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="p-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Invite Members */}
        <div className="lg:col-span-1">
          {canInviteMembers && (
            <Card>
              <CardHeader>
                <CardTitle>Invite Members</CardTitle>
                <CardDescription>Add new people to your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={inviting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      disabled={inviting}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="viewer">Viewer - Can view materials</option>
                      <option value="member">Member - Can create/edit materials</option>
                      <option value="admin">Admin - Can manage members</option>
                    </select>
                  </div>
                  <button
                    onClick={inviteMember}
                    disabled={inviting || !inviteEmail.trim()}
                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    {inviting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Team Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Members</span>
                  <span className="font-medium">{members.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending Invitations</span>
                  <span className="font-medium">{invitations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Your Role</span>
                  <Badge variant={getRoleBadgeVariant(currentUserRole)} className="flex items-center gap-1">
                    {getRoleIcon(currentUserRole)}
                    {currentUserRole}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}