import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(
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
    const { id: teamId } = await params

    // Check if user is a member of this team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 })
    }

    // Get team invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "pending")

    if (invitationsError) {
      console.error("Invitations fetch error:", invitationsError)
      return NextResponse.json({ error: invitationsError.message }, { status: 500 })
    }

    return NextResponse.json({
      invitations: invitations || []
    })
  } catch (error: any) {
    console.error("Team invitations API error:", error)
    return NextResponse.json({ error: "Failed to load team invitations" }, { status: 500 })
  }
}