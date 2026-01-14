"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Mail, Users, Crown, Shield, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

type Team = {
  id: string
  name: string
  role: string
  joined_at: string
  teams: {
    id: string
    name: string
    created_at: string
  }
}

type Member = {
  id: string
  user_id: string
  role: string
  joined_at: string
  email?: string
}

type Invitation = {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  token: string
}

export default function TeamsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [userRole, setUserRole] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // New team form
  const [newTeamName, setNewTeamName] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member")
  const [inviting, setInviting] = useState(false)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/")
        return
      }
      setUser(user)
      await loadTeams()
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
        if (data.teams.length > 0 && !selectedTeam) {
          setSelectedTeam(data.teams[0])
          loadTeamDetails(data.teams[0])
        }
      }
    } catch (error) {
      console.error("Failed to load teams:", error)
    }
  }

  const loadTeamDetails = async (team: Team) => {
    try {
      // Load members
      const membersResponse = await fetch(`/api/teams/${team.teams.id}/members`)
      const membersData = await membersResponse.json()
      if (membersData.members) {
        // Fetch user emails for each member
        const membersWithEmails = await Promise.all(
          membersData.members.map(async (member: Member) => {
            try {
              const { data } = await supabase.auth.admin.getUserById(member.user_id)
              return { ...member, email: data.user?.email || "Unknown" }
            } catch {
              // If admin API not available, just show user_id
              return { ...member, email: member.user_id }
            }
          }),
        )
        setMembers(membersWithEmails)
        setUserRole(membersData.userRole)
      }

      // Load invitations (only if admin/owner)
      if (["owner", "admin"].includes(team.role)) {
        const invitesResponse = await fetch(`/api/teams/${team.teams.id}/invitations`)
        const invitesData = await invitesResponse.json()
        if (invitesData.invitations) {
          setInvitations(invitesData.invitations)
        }
      }
    } catch (error) {
      console.error("Failed to load team details:", error)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim()) return
    setCreatingTeam(true)
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName }),
      })
      const data = await response.json()
      if (data.team) {
        setNewTeamName("")
        await loadTeams()
      } else {
        alert(data.error || "Failed to create team")
      }
    } catch (error) {
      alert("Failed to create team")
    } finally {
      setCreatingTeam(false)
    }
  }

  const sendInvite = async () => {
    if (!selectedTeam || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeam.teams.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await response.json()
      if (data.invitation) {
        setInviteEmail("")
        setInviteRole("member")
        // Copy invite link to clipboard
        const inviteLink = `${window.location.origin}/teams/accept-invite/${data.invitation.token}`
        await navigator.clipboard.writeText(inviteLink)
        alert("Invitation sent! Link copied to clipboard.")
        if (selectedTeam) loadTeamDetails(selectedTeam)
      } else {
        alert(data.error || "Failed to send invitation")
      }
    } catch (error) {
      alert("Failed to send invitation")
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (memberId: string) => {
    if (!selectedTeam) return
    if (!confirm("Are you sure you want to remove this member?")) return
    try {
      const response = await fetch(`/api/teams/${selectedTeam.teams.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      })
      const data = await response.json()
      if (data.success) {
        loadTeamDetails(selectedTeam)
      } else {
        alert(data.error || "Failed to remove member")
      }
    } catch (error) {
      alert("Failed to remove member")
    }
  }

  const cancelInvite = async (invitationId: string) => {
    if (!selectedTeam) return
    try {
      const response = await fetch(`/api/teams/${selectedTeam.teams.id}/invitations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      })
      const data = await response.json()
      if (data.success) {
        loadTeamDetails(selectedTeam)
      } else {
        alert(data.error || "Failed to cancel invitation")
      }
    } catch (error) {
      alert("Failed to cancel invitation")
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-muted-foreground">Manage your teams and collaborate with others</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
            <CardDescription>Create and select teams</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Create Team */}
            <div className="mb-4">
              <Label className="mb-2 block">Create New Team</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTeam()}
                />
                <Button onClick={createTeam} disabled={creatingTeam || !newTeamName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Teams List */}
            <div className="space-y-2">
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No teams yet</p>
              ) : (
                teams.map((team) => (
                  <Button
                    key={team.id}
                    variant={selectedTeam?.id === team.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedTeam(team)
                      loadTeamDetails(team)
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    <span className="truncate">{team.teams.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {team.role}
                    </Badge>
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Details */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedTeam ? (
            <Card>
              <CardContent className="p-12">
                <p className="text-center text-muted-foreground">Select a team to view details</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>{selectedTeam.teams.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Invite Form */}
                  {["owner", "admin"].includes(userRole) && (
                    <div className="mb-4 p-4 border rounded-lg">
                      <Label className="mb-2 block">Invite Member</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          placeholder="Email address"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="md:col-span-1"
                        />
                        <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin (Full catalog control)</SelectItem>
                            <SelectItem value="member">Member (Add/Edit catalog)</SelectItem>
                            <SelectItem value="viewer">Viewer (Read-only catalog)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
                          <Mail className="h-4 w-4 mr-2" />
                          Invite
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Members Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.email || member.user_id}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1 w-fit">
                              {getRoleIcon(member.role)}
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {["owner", "admin"].includes(userRole) &&
                              member.user_id !== user?.id &&
                              member.role !== "owner" && (
                                <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              {["owner", "admin"].includes(userRole) && invitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>Manage pending team invitations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invite) => (
                          <TableRow key={invite.id}>
                            <TableCell>{invite.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{invite.role}</Badge>
                            </TableCell>
                            <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => cancelInvite(invite.id)}>
                                Cancel
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
