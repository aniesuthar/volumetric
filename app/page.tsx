"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator, Package, TrendingUp, ExternalLink, Menu, X } from "lucide-react"
import { VolumetricWeightCalculator } from "@/components/volumetric-weight-calculator"
import { ProfitMarginCalculator } from "@/components/profit-margin-calculator"
import { InstallPrompt } from "@/components/install-prompt"

export default function HomePage() {
  const [activeCalculator, setActiveCalculator] = useState<"volumetric" | "profit">("volumetric")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-200 ease-in-out lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="md:p-6 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Maghji Logo" className="h-10 w-10 rounded-lg" />
                <div>
                  <h1 className="text-lg font-bold text-sidebar-foreground">MaghjiFurnishings</h1>
                  <p className="text-xs text-sidebar-foreground/70">Business Tools</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-sidebar-foreground"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              <Button
                variant={activeCalculator === "volumetric" ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => {
                  setActiveCalculator("volumetric")
                  setSidebarOpen(false)
                }}
              >
                <Package className="h-4 w-4" />
                Volumetric Weight
              </Button>
              <Button
                variant={activeCalculator === "profit" ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => {
                  setActiveCalculator("profit")
                  setSidebarOpen(false)
                }}
              >
                <TrendingUp className="h-4 w-4" />
                Profit Margin
              </Button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <a
              href="https://www.maghji.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            >
              Visit Website
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-xs text-sidebar-foreground/50 mt-2">A brand by Bhadrecha Metalworks Co.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="border-b bg-card px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Calculator className="hidden md:inline-block h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-foreground">
                    {activeCalculator === "volumetric" ? "Volumetric Weight Calculator" : "Profit Margin Calculator"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {activeCalculator === "volumetric"
                      ? "Calculate shipping weights and costs"
                      : "Analyze profit margins and fees"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Calculator Content */}
        <main className="flex-1 p-2 lg:p-6">
          <Card className="h-full">
            <CardContent className="px-4">
              {activeCalculator === "volumetric" ? <VolumetricWeightCalculator /> : <ProfitMarginCalculator />}
            </CardContent>
          </Card>
        </main>

        <InstallPrompt />
      </div>
    </div>
  )
}
