import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: invitationId } = await params

    // Get the invitation to be cancelled
    const { data: invitation, error: invitationError } = await supabase
      .from("team_invitations")
      .select("team_id, email")
      .eq("id", invitationId)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // Check if current user has permission (owner or admin of the team)
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", invitation.team_id)
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 })
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "You don't have permission to cancel invitations" }, { status: 403 })
    }

    // Cancel the invitation
    const { error: deleteError } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", invitationId)

    if (deleteError) {
      console.error("Cancel invitation error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Cancel invitation error:", error)
    return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 })
  }
}