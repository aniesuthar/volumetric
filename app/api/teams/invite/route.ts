import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { Resend } from "resend"
import { generateInvitationToken, createInvitationUrl } from "@/lib/utils/invitation-tokens"
import { getTeamInvitationEmailHtml, getTeamInvitationEmailText } from "@/lib/email-templates/team-invitation"

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json()
    const { teamId, email, role } = body

    if (!teamId || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Check if user has permission to invite (owner or admin)
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 })
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "You don't have permission to invite members" }, { status: 403 })
    }

    // Note: We can't easily check if email is already a team member without accessing auth.users
    // This check would need to be done differently in a production app
    // For now, we'll rely on the invitation system and let users handle duplicates

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", email)
      .eq("status", "pending")
      .single()

    if (existingInvitation) {
      return NextResponse.json({ error: "Invitation already sent to this email" }, { status: 400 })
    }

    // Generate secure invitation token
    const token = generateInvitationToken()
    const invitationUrl = createInvitationUrl(token)

    // Get team details for the email
    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single()

    if (teamError || !teamData) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Get current user's details using admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: inviterData, error: inviterError } = await adminSupabase.auth.admin.getUserById(user.id)
    const inviterName = inviterData.user?.user_metadata?.name || inviterData.user?.email || "Team Admin"
    const inviterEmail = inviterData.user?.email || ""

    // Create invitation with token
    const { data: invitation, error: invitationError } = await supabase
      .from("team_invitations")
      .insert({
        team_id: teamId,
        email: email.toLowerCase().trim(),
        role,
        token,
        invited_by: user.id
      })
      .select()
      .single()

    if (invitationError) {
      console.error("Invitation creation error:", invitationError)
      return NextResponse.json({ error: invitationError.message }, { status: 500 })
    }

    // Send email invitation
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)

      const emailHtml = getTeamInvitationEmailHtml({
        inviteeName: email.split('@')[0], // Use part before @ as name
        teamName: teamData.name,
        inviterName,
        inviterEmail,
        role,
        invitationUrl
      })

      const emailText = getTeamInvitationEmailText({
        inviteeName: email.split('@')[0],
        teamName: teamData.name,
        inviterName,
        inviterEmail,
        role,
        invitationUrl
      })

      const { error: emailError } = await resend.emails.send({
        from: `${teamData.name} <no-reply@maghji.com>`,
        to: email,
        subject: `You're invited to join ${teamData.name}`,
        html: emailHtml,
        text: emailText,
      })

      if (emailError) {
        console.error("Email sending error:", emailError)
        // Don't fail the request if email fails - invitation is still created
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError)
      // Don't fail the request if email fails - invitation is still created
    }

    return NextResponse.json({
      invitation: {
        ...invitation,
        invitationUrl // Include URL in response for testing
      }
    })
  } catch (error: any) {
    console.error("Team invitation error:", error)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}