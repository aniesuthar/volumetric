import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single()

  if (inviteError || !invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 })
  }

  // Check if invitation has expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase.from("team_invitations").update({ status: "expired" }).eq("id", invitation.id)
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 })
  }

  // Check if user's email matches the invitation
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation is for a different email address" },
      { status: 403 },
    )
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", invitation.team_id)
    .eq("user_id", user.id)
    .single()

  if (existingMember) {
    await supabase.from("team_invitations").update({ status: "accepted" }).eq("id", invitation.id)
    return NextResponse.json({ error: "You are already a member of this team" }, { status: 400 })
  }

  // Add user to team
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: invitation.team_id,
    user_id: user.id,
    role: invitation.role,
  })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Mark invitation as accepted
  await supabase.from("team_invitations").update({ status: "accepted" }).eq("id", invitation.id)

  // Get team details
  const { data: team } = await supabase.from("teams").select("*").eq("id", invitation.team_id).single()

  return NextResponse.json({ success: true, team })
}
