"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TeamManagement } from "@/components/team-management"

export default function TeamDetailsPage() {
  const params = useParams()
  const teamId = params.id as string

  return (
    <DashboardLayout
      activeSection="account"
      title="Team Management"
      description="Manage team members, settings, and permissions"
    >
      <TeamManagement teamId={teamId} />
    </DashboardLayout>
  )
}