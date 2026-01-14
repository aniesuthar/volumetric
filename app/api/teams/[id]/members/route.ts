import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
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

    // Get user emails using admin client (also use for team members to bypass RLS)
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

    // Get team members using admin client to bypass RLS policies
    const { data: members, error: membersError } = await adminSupabase
      .from("team_members")
      .select(`
        id,
        user_id,
        role,
        joined_at
      `)
      .eq("team_id", teamId)

    if (membersError) {
      console.error("Members fetch error:", membersError)
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const memberEmails: { [key: string]: string } = {}

    if (members) {
      // Fetch emails for each user using admin client
      for (const member of members) {
        try {
          const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(member.user_id)
          if (!userError && userData.user) {
            memberEmails[member.user_id] = userData.user.email || `user-${member.user_id.substring(0, 8)}`
          } else {
            memberEmails[member.user_id] = `user-${member.user_id.substring(0, 8)}`
          }
        } catch (e) {
          memberEmails[member.user_id] = `user-${member.user_id.substring(0, 8)}`
        }
      }
    }

    // Combine member data with emails
    const membersWithEmails = members?.map(member => ({
      ...member,
      email: memberEmails[member.user_id] || `user-${member.user_id.substring(0, 8)}`
    })) || []

    return NextResponse.json({
      members: membersWithEmails,
      currentUserRole: membership.role
    })
  } catch (error: any) {
    console.error("Team members API error:", error)
    return NextResponse.json({ error: "Failed to load team members" }, { status: 500 })
  }
}