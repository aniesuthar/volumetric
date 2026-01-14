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
    const { id: memberId } = await params

    // Get the member to be removed
    const { data: memberToRemove, error: memberError } = await supabase
      .from("team_members")
      .select("team_id, user_id, role")
      .eq("id", memberId)
      .single()

    if (memberError || !memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Check if current user has permission (owner or admin of the team)
    const { data: currentMembership, error: currentMembershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", memberToRemove.team_id)
      .eq("user_id", user.id)
      .single()

    if (currentMembershipError || !currentMembership) {
      return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 })
    }

    if (!["owner", "admin"].includes(currentMembership.role)) {
      return NextResponse.json({ error: "You don't have permission to remove members" }, { status: 403 })
    }

    // Prevent removing the owner
    if (memberToRemove.role === "owner") {
      return NextResponse.json({ error: "Cannot remove team owner" }, { status: 400 })
    }

    // Prevent removing yourself
    if (memberToRemove.user_id === user.id) {
      return NextResponse.json({ error: "Cannot remove yourself from the team" }, { status: 400 })
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId)

    if (deleteError) {
      console.error("Delete member error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Remove member error:", error)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}