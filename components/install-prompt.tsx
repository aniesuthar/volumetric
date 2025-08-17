"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    console.log("[v0] InstallPrompt component mounted")

    const handler = (e: Event) => {
      console.log("[v0] beforeinstallprompt event fired", e)
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    const checkPWAReadiness = () => {
      console.log("[v0] Checking PWA readiness...")
      console.log("[v0] Service Worker supported:", "serviceWorker" in navigator)
      console.log("[v0] Current URL:", window.location.href)
      console.log("[v0] Is HTTPS:", window.location.protocol === "https:")

      if (window.matchMedia("(display-mode: standalone)").matches) {
        console.log("[v0] App is already installed")
      }
    }

    checkPWAReadiness()
    window.addEventListener("beforeinstallprompt", handler)

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches

    if (isIOS && !isInStandaloneMode) {
      console.log("[v0] iOS detected - showing manual install instructions")
      setTimeout(() => setShowInstallPrompt(true), 3000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstallClick = async () => {
    console.log("[v0] Install button clicked", { deferredPrompt })

    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        alert(
          "To install this app on iOS:\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to confirm",
        )
        return
      }
      console.log("[v0] No deferred prompt available")
      return
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log("[v0] Install prompt outcome:", outcome)

      if (outcome === "accepted") {
        setDeferredPrompt(null)
        setShowInstallPrompt(false)
      }
    } catch (error) {
      console.error("[v0] Error during install:", error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
  }

  if (!showInstallPrompt) return null

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-orange-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-gray-900">Install App</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {isIOS
          ? "Add Maghji Calculators to your home screen for quick access."
          : "Install Maghji Calculators for quick access to your business tools."}
      </p>
      <div className="flex gap-2">
        <Button onClick={handleInstallClick} className="flex-1 bg-orange-600 hover:bg-orange-700" size="sm">
          {isIOS ? "Show Instructions" : "Install"}
        </Button>
        <Button variant="outline" onClick={handleDismiss} size="sm">
          Not now
        </Button>
      </div>
    </div>
  )
}
