"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { VolumetricWeightCalculator } from "@/components/volumetric-weight-calculator"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <DashboardLayout
      activeSection="volumetric"
      title="Volumetric Weight Calculator"
      description="Calculate shipping weights and costs"
    >
      <Card className="h-full">
        <CardContent>
          <VolumetricWeightCalculator />
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}