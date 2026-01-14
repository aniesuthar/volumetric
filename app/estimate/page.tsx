"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { EstimateCalculator } from "@/components/estimate-calculator"
import { Card, CardContent } from "@/components/ui/card"

export default function EstimatePage() {
  return (
    <DashboardLayout
      activeSection="estimate"
      title="Fabrication Estimate"
      description="Estimate fabrication weight and pricing from your materials"
    >
      <Card className="h-full">
        <CardContent>
          <EstimateCalculator />
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}