"use client"

import { useState, useEffect } from "react"
import { Calculator, Package, TrendingUp, ExternalLink, Menu, X, Wrench, User, ShoppingBag } from "lucide-react"
import { InstallPrompt } from "@/components/install-prompt"
import { AuthButton } from "@/components/auth-button"
import { NavLink } from "@/components/nav-link"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"

type DashboardLayoutProps = {
  children: React.ReactNode
  activeSection: "volumetric" | "profit" | "estimate" | "account" | "meesho"
  title: string
  description: string
}

export function DashboardLayout({ children, activeSection, title, description }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setIsAuthenticated(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  const navigationItems = [
    {
      id: "volumetric",
      label: "Volumetric Weight",
      icon: Package,
      href: "/",
    },
    {
      id: "profit",
      label: "Profit Margin",
      icon: TrendingUp,
      href: "/profit",
    },
    {
      id: "estimate",
      label: "Fabrication Estimate",
      icon: Wrench,
      href: "/estimate",
    },
    {
      id: "meesho",
      label: "Meesho Orders",
      icon: ShoppingBag,
      href: "/meesho",
    },
    {
      id: "account",
      label: "My Account",
      icon: User,
      href: "/account",
    },
  ]


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
              <button
                className="lg:hidden p-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems
                .filter((item) => {
                  // Hide protected items if not authenticated
                  if (!isAuthenticated && (item.id === "estimate" || item.id === "meesho" || item.id === "account")) {
                    return false
                  }
                  return true
                })
                .map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id
                  return (
                    <NavLink
                      key={item.id}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={
                        isActive
                          ? "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground no-underline"
                          : "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors no-underline"
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  )
                })}
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
              <button
                className="lg:hidden p-2 hover:bg-accent rounded-md"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calculator className="hidden md:inline-block h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-foreground">{title}</h2>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
            <AuthButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-2 lg:p-6">
          <div className="h-full">
            {children}
          </div>
        </main>

        <InstallPrompt />
      </div>
    </div>
  )
}