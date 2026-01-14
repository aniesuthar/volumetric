import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { isValidInvitationToken } from "@/lib/utils/invitation-tokens"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token || !isValidInvitationToken(token)) {
    return NextResponse.json({ error: "Invalid invitation token" }, { status: 400 })
  }

  try {
    // Use admin client to check invitation - no auth required for viewing
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

    const { data: invitation, error } = await adminSupabase
      .from("team_invitations")
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        team:teams(id, name)
      `)
      .eq("token", token)
      .eq("status", "pending")
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: "Invitation not found or has expired" }, { status: 404 })
    }

    // Check if user is authenticated to provide additional context
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

    const { data: { user } } = await supabase.auth.getUser()

    return NextResponse.json({
      invitation,
      currentUser: user ? {
        id: user.id,
        email: user.email,
        isCorrectEmail: user.email?.toLowerCase() === invitation.email.toLowerCase()
      } : null
    })
  } catch (error: any) {
    console.error("Accept invitation GET error:", error)
    return NextResponse.json({ error: "Failed to load invitation" }, { status: 500 })
  }
}

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
    return NextResponse.json({ error: "Please sign in to accept the invitation" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { token } = body

    if (!token || !isValidInvitationToken(token)) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 400 })
    }

    // Use admin client for invitation operations
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

    // Get invitation details
    const { data: invitation, error: invitationError } = await adminSupabase
      .from("team_invitations")
      .select(`
        id,
        email,
        role,
        status,
        team_id,
        team:teams(id, name)
      `)
      .eq("token", token)
      .eq("status", "pending")
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: "Invitation not found or has expired" }, { status: 404 })
    }

    // Check if the invitation email matches the user's email
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({
        error: `This invitation is for ${invitation.email}. Please sign in with that email address.`
      }, { status: 403 })
    }

    // Check if user is already a team member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", invitation.team_id)
      .eq("user_id", user.id)
      .single()

    if (existingMember) {
      // Update invitation to accepted status
      await adminSupabase
        .from("team_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id)

      return NextResponse.json({
        message: "You're already a member of this team",
        team: invitation.team
      })
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role
      })

    if (memberError) {
      console.error("Team member creation error:", memberError)
      return NextResponse.json({ error: "Failed to join team" }, { status: 500 })
    }

    // Update invitation status to accepted
    const { error: updateError } = await adminSupabase
      .from("team_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id)

    if (updateError) {
      console.error("Invitation update error:", updateError)
      // Don't fail the request since the user was successfully added to the team
    }

    return NextResponse.json({
      message: "Successfully joined team",
      team: invitation.team
    })
  } catch (error: any) {
    console.error("Accept invitation POST error:", error)
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 })
  }
}