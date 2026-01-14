import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
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
    // Get team memberships first
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from("team_members")
      .select("team_id, role, joined_at")
      .eq("user_id", user.id)

    if (teamMembersError) {
      throw teamMembersError
    }

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({ teams: [] })
    }

    // Get team details separately to avoid recursion
    const teamIds = teamMembers.map(tm => tm.team_id)
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, created_at")
      .in("id", teamIds)

    if (teamsError) {
      throw teamsError
    }

    // Combine the data
    const result = teamMembers.map(tm => {
      const team = teams?.find(t => t.id === tm.team_id)
      return {
        id: `${tm.team_id}_${user.id}`, // Unique identifier for the membership
        role: tm.role,
        joined_at: tm.joined_at,
        teams: team || { id: tm.team_id, name: 'Unknown Team', created_at: null }
      }
    }).filter(item => item.teams.name !== 'Unknown Team')

    return NextResponse.json({ teams: result })
  } catch (error: any) {
    console.error("Teams API error:", error)
    return NextResponse.json({ error: error.message || "Failed to load teams" }, { status: 500 })
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 })
  }

  try {
    // Create team (trigger will automatically add creator as owner)
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        created_by: user.id,
      })
      .select()
      .single()

    if (teamError) {
      console.error("Team creation error:", teamError)
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }

    return NextResponse.json({ team })
  } catch (error: any) {
    console.error("Team creation error:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
