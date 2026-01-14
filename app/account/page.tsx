"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { SimpleAccountDashboard } from "@/components/simple-account-dashboard"

export default function AccountPage() {
  return (
    <DashboardLayout activeSection="account" title="My Account" description="Manage your profile, teams, and account settings">
      <SimpleAccountDashboard />
    </DashboardLayout>
  )
}