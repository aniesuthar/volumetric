"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { MeeshoOrderTracker } from "@/components/meesho-order-tracker"

export default function MeeshoPage() {
  return (
    <DashboardLayout
      activeSection="meesho"
      title="Meesho Orders"
      description="Track and manage your Meesho orders with real-time status updates"
    >
      <MeeshoOrderTracker />
    </DashboardLayout>
  )
}
