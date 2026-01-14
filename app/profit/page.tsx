"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfitMarginCalculator } from "@/components/profit-margin-calculator"
import { Card, CardContent } from "@/components/ui/card"

export default function ProfitPage() {
  return (
    <DashboardLayout
      activeSection="profit"
      title="Profit Margin Calculator"
      description="Analyze profit margins and fees"
    >
      <Card className="h-full">
        <CardContent>
          <ProfitMarginCalculator />
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}