"use client"

import type React from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { useEffect, useMemo, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Save } from "lucide-react"

type Material = {
  id: string
  type: "Sariya" | "Pati" | "Sheet" | "Pipe" | "Other"
  name: string
  baseLengthFt: number // usually 20 ft
  weightAtBaseLengthKg: number // weight (kg) at base length
  pricePerKg: number // INR per kg
  teamId?: string // Optional team association
}

type Team = {
  id: string
  name: string
  role: "owner" | "admin" | "member" | "viewer"
}

type UserPermissions = {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

type LineItem = {
  id: string
  materialId: string
  lengthFt: number
  qty: number
}

type Preset = { name: "A" | "B" | "C"; lines: LineItem[]; timestamp: number }

const STORAGE_KEY = "mf_materials_v1"
const PRESETS_STORAGE_KEY = "mf_presets_v1"

// Helper: safely evaluate arithmetic expressions for length input
function evaluateExpression(expr: string): number {
  const cleaned = (expr || "").replace(/[^0-9+\-*/().\s]/g, "")
  if (cleaned.trim() === "") return 0
  try {
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict";return (' + cleaned + ")")()
    return typeof val === "number" && isFinite(val) ? val : Number.NaN
  } catch {
    return Number.NaN
  }
}

// Helpers to encode/decode catalog into URL-safe base64 for Share Link
function encodeCatalog(data: unknown): string {
  try {
    const json = JSON.stringify(data)
    // encodeURIComponent to handle unicode before btoa
    const b64 = btoa(unescape(encodeURIComponent(json)))
    // URL-safe
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  } catch {
    return ""
  }
}
function decodeCatalog(s: string): any | null {
  try {
    const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)
    const json = decodeURIComponent(escape(atob(padded)))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function EstimateCalculator() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions>({
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  })
  const [materialDraft, setMaterialDraft] = useState<Material>({
    id: "",
    type: "Sariya",
    name: "",
    baseLengthFt: 20,
    weightAtBaseLengthKg: 0,
    pricePerKg: 0,
  })

  const [lines, setLines] = useState<LineItem[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("")
  const [lengthUnit, setLengthUnit] = useState<"ft" | "in">("ft")
  const [lengthExpr, setLengthExpr] = useState<string>("")
  const [lineQty, setLineQty] = useState<number>(1)

  const [wastagePercent, setWastagePercent] = useState<number>(0)
  const [cuttingPerCut, setCuttingPerCut] = useState<number>(0)
  const [cutsCount, setCutsCount] = useState<number>(0)
  const [laborPerKg, setLaborPerKg] = useState<number>(0)
  const [overheadPercent, setOverheadPercent] = useState<number>(0)

  const [presets, setPresets] = useState<Preset[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Load materials from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setMaterials(JSON.parse(raw))
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const param = url.searchParams.get("catalog")
      if (param) {
        const decoded = decodeCatalog(param)
        if (Array.isArray(decoded)) {
          const ok = window.confirm("Import materials catalog from link? This will replace your current catalog.")
          if (ok) {
            setMaterials(decoded as Material[])
            localStorage.setItem(STORAGE_KEY, JSON.stringify(decoded))
          }
        }
        // remove param to keep URL clean
        url.searchParams.delete("catalog")
        window.history.replaceState({}, "", url.toString())
      }
    } catch {}
  }, [])

  // Persist materials
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(materials))
    } catch {}
  }, [materials])

  // Load/persist presets in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (raw) setPresets(JSON.parse(raw) as Preset[])
    } catch {}
  }, [])

  // Reload materials when team selection changes
  useEffect(() => {
    if (userId && selectedTeamId !== undefined) {
      loadCloudMaterials()
    }
  }, [selectedTeamId])
  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets))
    } catch {}
  }, [presets])

  // Auto-derive default cuts from number of lines (user can override)
  useEffect(() => {
    if (cutsCount === 0) {
      setCutsCount(lines.length)
    }
  }, [lines])

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data } = await supabase.auth.getUser()
        const uid = data.user?.id ?? null
        const email = data.user?.email ?? null
        setUserId(uid)
        setUserEmail(email)
        // Load teams and materials when a user session exists
        if (uid) {
          await loadUserTeams()
          await loadCloudMaterials()
        }
      } catch (e) {
        // remain local if Supabase is not configured or unavailable
      }
    }
    init()
    // no cloud toggle; run once on mount
  }, [])

  const handleSignIn = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: window.prompt("Enter your email") || "",
        password: window.prompt("Enter your password") || "",
      })
      if (error) {
        alert(error.message)
        return
      }
      setUserId(data.user?.id ?? null)
      if (data.user?.id) {
        await loadCloudMaterials()
      }
    } catch (e: any) {
      console.log("[v0] handleSignIn error:", e?.message || e)
    }
  }

  const handleSignUp = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email: window.prompt("Enter your email") || "",
        password: window.prompt("Enter your password") || "",
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
        },
      })
      if (error) {
        alert(error.message)
        return
      }
      alert("Sign-up successful. Please check your email to verify.")
      setUserId(data.user?.id ?? null)
    } catch (e: any) {
      console.log("[v0] handleSignUp error:", e?.message || e)
    }
  }

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    setUserId(null)
    // fall back to local materials
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setMaterials(JSON.parse(raw))
    } catch {}
  }

  // Helper: compute weight per foot for a material
  const weightPerFoot = (m: Material) => m.weightAtBaseLengthKg / m.baseLengthFt

  const loadUserTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      const data = await response.json()
      if (data.teams && Array.isArray(data.teams)) {
        const mappedTeams = data.teams.map((t: any) => ({
          id: t.teams.id,
          name: t.teams.name,
          role: t.role,
        }))
        setTeams(mappedTeams)
        // Auto-select first team if available
        if (mappedTeams.length > 0) {
          setSelectedTeamId(mappedTeams[0].id)
          updatePermissions(mappedTeams[0].role)
        }
      }
    } catch (e: any) {
      console.log("[v0] loadUserTeams error:", e?.message || e)
    }
  }

  const updatePermissions = (role: string) => {
    switch (role) {
      case "viewer":
        setPermissions({
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        })
        break
      case "member":
        setPermissions({
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: false,
        })
        break
      case "admin":
        setPermissions({
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        })
        break
      case "owner":
        setPermissions({
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        })
        break
      default:
        // Personal catalog - full permissions
        setPermissions({
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        })
    }
  }

  const loadCloudMaterials = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      let query = supabase.from("materials").select("*").order("created_at", { ascending: false })

      // Filter by team if selected, otherwise load personal materials
      if (selectedTeamId) {
        query = query.eq("team_id", selectedTeamId)
      } else {
        // Load personal materials (user_id = current user AND team_id is null)
        if (userId) {
          query = query.eq("user_id", userId).is("team_id", null)
        } else {
          // If no user, return early
          setMaterials([])
          return
        }
      }

      const { data, error } = await query
      if (error) throw error
      if (Array.isArray(data)) {
        // map to client shape
        const mapped = data.map((r: any) => ({
          id: r.id,
          type: r.type,
          name: r.name,
          baseLengthFt: Number(r.base_length_ft),
          weightAtBaseLengthKg: Number(r.weight_at_base_kg),
          pricePerKg: Number(r.price_per_kg),
          teamId: r.team_id,
        })) as Material[]
        setMaterials(mapped)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
      }
    } catch (e: any) {
      console.log("[v0] loadCloudMaterials error:", e?.message || e)
    }
  }

  const addMaterial = async () => {
    if (!permissions.canCreate) {
      alert("You don't have permission to add materials")
      return
    }
    if (!materialDraft.name || materialDraft.weightAtBaseLengthKg <= 0 || materialDraft.pricePerKg <= 0) return
    const newMat: Material = {
      ...materialDraft,
      id: crypto.randomUUID(),
      baseLengthFt: materialDraft.baseLengthFt || 20,
      teamId: selectedTeamId || undefined,
    }

    if (userId) {
      try {
        const supabase = getSupabaseBrowserClient()
        const { error } = await supabase.from("materials").insert({
          user_id: userId,
          team_id: selectedTeamId,
          type: newMat.type,
          name: newMat.name,
          base_length_ft: newMat.baseLengthFt,
          weight_at_base_kg: newMat.weightAtBaseLengthKg,
          price_per_kg: newMat.pricePerKg,
        })
        if (error) throw error
        await loadCloudMaterials()
      } catch (e: any) {
        alert("Failed to save to cloud. Using local storage.")
        setMaterials((prev) => [newMat, ...prev])
      }
    } else {
      setMaterials((prev) => [newMat, ...prev])
    }

    setMaterialDraft({
      id: "",
      type: "Sariya",
      name: "",
      baseLengthFt: 20,
      weightAtBaseLengthKg: 0,
      pricePerKg: 0,
    })
  }

  const removeMaterial = async (id: string) => {
    if (!permissions.canDelete) {
      alert("You don't have permission to delete materials")
      return
    }
    if (userId) {
      try {
        const supabase = getSupabaseBrowserClient()
        const { error } = await supabase.from("materials").delete().eq("id", id)
        if (error) throw error
        await loadCloudMaterials()
      } catch (e: any) {
        alert("Failed to remove from cloud. Removing locally.")
        setMaterials((prev) => prev.filter((m) => m.id !== id))
      }
    } else {
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    }
    setLines((prev) => prev.filter((l) => l.materialId !== id))
  }

  const addLine = () => {
    if (!selectedMaterialId) return
    const mat = materials.find((m) => m.id === selectedMaterialId)
    if (!mat) return
    const raw = evaluateExpression(lengthExpr)
    if (!raw || !isFinite(raw) || raw <= 0) return
    const lengthFtComputed = lengthUnit === "ft" ? raw : raw / 12
    if (lineQty <= 0) return
    setLines((prev) => [
      {
        id: crypto.randomUUID(),
        materialId: selectedMaterialId,
        lengthFt: lengthFtComputed,
        qty: lineQty,
      },
      ...prev,
    ])
    setLengthExpr("")
    setLineQty(1)
  }

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const exportMaterials = () => {
    try {
      const blob = new Blob([JSON.stringify(materials, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "materials-catalog.json"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert("Failed to export catalog.")
    }
  }

  const onPickImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "[]"))
        if (Array.isArray(parsed)) {
          setMaterials(parsed as Material[])
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
          alert("Catalog imported.")
        } else {
          alert("Invalid catalog file.")
        }
      } catch {
        alert("Invalid catalog file.")
      } finally {
        // reset input so selecting the same file again works
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  const shareLink = async () => {
    try {
      const encoded = encodeCatalog(materials)
      if (!encoded) {
        alert("Nothing to share.")
        return
      }
      const url = new URL(window.location.href)
      url.searchParams.set("catalog", encoded)
      await navigator.clipboard.writeText(url.toString())
      alert("Share link copied to clipboard.")
    } catch {
      alert("Failed to copy share link.")
    }
  }

  // Helpers for presets
  const hasPreset = (name: "A" | "B" | "C") => presets.some((p) => p.name === name)
  const savePreset = (name: "A" | "B" | "C") => {
    if (lines.length === 0) {
      alert("Add at least one line before saving a preset.")
      return
    }
    const snapshot: Preset = { name, lines: JSON.parse(JSON.stringify(lines)), timestamp: Date.now() }
    setPresets((prev) => {
      const filtered = prev.filter((p) => p.name !== name)
      return [...filtered, snapshot].sort((a, b) => a.name.localeCompare(b.name))
    })
  }
  const applyPreset = (name: "A" | "B" | "C") => {
    const p = presets.find((x) => x.name === name)
    if (!p) return
    setLines(JSON.parse(JSON.stringify(p.lines)))
  }
  const clearPreset = (name: "A" | "B" | "C") => {
    setPresets((prev) => prev.filter((p) => p.name !== name))
  }

  // Totals
  const totals = useMemo(() => {
    let totalWeight = 0
    let totalCost = 0
    const detailed = lines.map((l) => {
      const mat = materials.find((m) => m.id === l.materialId)
      if (!mat) return { ...l, mat, weightKg: 0, cost: 0 }
      const perFt = weightPerFoot(mat)
      const weightKg = perFt * l.lengthFt * l.qty
      const cost = weightKg * mat.pricePerKg
      totalWeight += weightKg
      totalCost += cost
      return { ...l, mat, weightKg, cost }
    })
    // Apply add-ons to totals
    const wastageAdd = (totalCost * (wastagePercent || 0)) / 100
    const overheadAdd = (totalCost * (overheadPercent || 0)) / 100
    const cuttingAdd = (cuttingPerCut || 0) * (cutsCount || 0)
    const laborAdd = (laborPerKg || 0) * totalWeight
    const grandTotal = totalCost + wastageAdd + overheadAdd + cuttingAdd + laborAdd

    return { totalWeight, totalCost, detailed, wastageAdd, overheadAdd, cuttingAdd, laborAdd, grandTotal }
  }, [lines, materials, wastagePercent, overheadPercent, cuttingPerCut, cutsCount, laborPerKg])

  // Derive per-preset totals for comparison
  const presetSummaries = useMemo(() => {
    const summarize = (p: Preset) => {
      let weight = 0
      let cost = 0
      let totalFt = 0
      for (const l of p.lines) {
        const mat = materials.find((m) => m.id === l.materialId)
        if (!mat) continue
        const perFt = weightPerFoot(mat)
        const w = perFt * l.lengthFt * l.qty
        const c = w * mat.pricePerKg
        const ft = l.lengthFt * l.qty
        weight += w
        cost += c
        totalFt += ft
      }
      // Apply same add-on settings to keep comparison consistent
      const wast = (cost * (wastagePercent || 0)) / 100
      const over = (cost * (overheadPercent || 0)) / 100
      const cut = (cuttingPerCut || 0) * (cutsCount || 0)
      const lab = (laborPerKg || 0) * weight
      const total = cost + wast + over + cut + lab
      return { name: p.name, totalFt, weight, baseCost: cost, total }
    }
    return presets.map(summarize).sort((a, b) => a.total - b.total)
  }, [presets, materials, wastagePercent, overheadPercent, cuttingPerCut, cutsCount, laborPerKg])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Materials Catalog */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">Materials Catalog</h3>
              {teams.length > 0 && (
                <Select
                  value={selectedTeamId || "personal"}
                  onValueChange={(value) => {
                    const teamId = value === "personal" ? null : value
                    setSelectedTeamId(teamId)
                    if (teamId) {
                      const team = teams.find(t => t.id === teamId)
                      if (team) updatePermissions(team.role)
                    } else {
                      updatePermissions("personal")
                    }
                    loadCloudMaterials()
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Catalog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Catalog</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedTeamId && !permissions.canCreate && (
                <Badge variant="secondary">View Only</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportMaterials}>
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onPickImportFile}
              />
              <Button size="sm" onClick={shareLink}>
                Share Link
              </Button>
            </div>
          </div>

          {/* Disable mobile auth block entirely */}
          {false && (
            <div className="md:hidden mb-3 grid grid-cols-2 gap-2">{/* mobile auth UI removed by request */}</div>
          )}

          {/* Add Material - Only show if user has create permission */}
          {permissions.canCreate ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <Label className="mb-1 block">Type</Label>
              <Select
                value={materialDraft.type}
                onValueChange={(v: Material["type"]) => setMaterialDraft((d) => ({ ...d, type: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sariya">Sariya</SelectItem>
                  <SelectItem value="Pati">Pati</SelectItem>
                  <SelectItem value="Sheet">Sheet</SelectItem>
                  <SelectItem value="Pipe">Pipe</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="mb-1 block">Name / Spec</Label>
              <Input
                placeholder="e.g. 1&quot; Pipe (Light)"
                value={materialDraft.name}
                onChange={(e) => setMaterialDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1 block">Base Length (ft)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={materialDraft.baseLengthFt}
                onChange={(e) => setMaterialDraft((d) => ({ ...d, baseLengthFt: Number(e.target.value || 0) }))}
              />
            </div>
            <div>
              <Label className="mb-1 block">Weight @ Base (kg)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={materialDraft.weightAtBaseLengthKg}
                onChange={(e) => setMaterialDraft((d) => ({ ...d, weightAtBaseLengthKg: Number(e.target.value || 0) }))}
              />
            </div>
            <div>
              <Label className="mb-1 block">Price per kg (₹)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={materialDraft.pricePerKg}
                onChange={(e) => setMaterialDraft((d) => ({ ...d, pricePerKg: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Button
                onClick={addMaterial}
                className="w-full"
                disabled={!permissions.canCreate}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Material
              </Button>
            </div>
          </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Badge variant="secondary" className="mb-2">View Only Mode</Badge>
              <p className="text-sm">You have read-only access to this catalog</p>
            </div>
          )}

          <Separator className="my-4" />

          {/* Materials List */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Wt/ft (kg)</TableHead>
                  <TableHead className="text-right">Price/kg</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No materials saved yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.type}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{m.name}</TableCell>
                      <TableCell className="text-right">
                        {(m.weightAtBaseLengthKg / m.baseLengthFt).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">₹{m.pricePerKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {permissions.canDelete ? (
                          <Button variant="ghost" size="icon" onClick={() => removeMaterial(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Estimate Builder */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <h3 className="text-base font-semibold mb-4">Estimate Builder</h3>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => savePreset("A")}>
                Save A
              </Button>
              <Button variant="outline" size="sm" onClick={() => savePreset("B")}>
                Save B
              </Button>
              <Button variant="outline" size="sm" onClick={() => savePreset("C")}>
                Save C
              </Button>
            </div>
            <Separator orientation="vertical" className="mx-1 h-6 hidden md:block" />
            <div className="flex items-center gap-2">
              {(["A", "B", "C"] as const).map((n) =>
                hasPreset(n) ? (
                  <Badge key={n} variant="default" className="cursor-pointer" onClick={() => applyPreset(n)}>
                    {n}: Apply
                  </Badge>
                ) : (
                  <Badge key={n} variant="outline" className="opacity-60">
                    {n}: empty
                  </Badge>
                ),
              )}
              {(["A", "B", "C"] as const).map((n) =>
                hasPreset(n) ? (
                  <Button key={`clear-${n}`} variant="ghost" size="sm" onClick={() => clearPreset(n)}>
                    Clear {n}
                  </Button>
                ) : null,
              )}
            </div>
          </div>

          {/* Add Line */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2 md:col-span-2">
              <Label className="mb-1 block">Material</Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose from catalog" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.type}: {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Length</Label>
              <Input
                placeholder="e.g. 10+12+15"
                inputMode="text"
                pattern="[0-9+\\-*/().\\s]*"
                value={lengthExpr}
                onChange={(e) => setLengthExpr(e.target.value)}
              />
              <div className="mt-2">
                <Select value={lengthUnit} onValueChange={(v: "ft" | "in") => setLengthUnit(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ft">Feet (ft)</SelectItem>
                    <SelectItem value="in">Inch (in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Qty</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={lineQty}
                onChange={(e) => setLineQty(Number(e.target.value || 0))}
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <Button
                onClick={addLine}
                disabled={
                  !selectedMaterialId ||
                  Number.isNaN(evaluateExpression(lengthExpr)) ||
                  evaluateExpression(lengthExpr) <= 0 ||
                  lineQty <= 0
                }
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
          </div>

          {/* Lines Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Length (ft)</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead className="text-right">Cost (₹)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totals.detailed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No items added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  totals.detailed.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-[240px] truncate">
                        {d.mat?.type}: {d.mat?.name}
                      </TableCell>
                      <TableCell className="text-right">{d.lengthFt}</TableCell>
                      <TableCell className="text-right">{d.qty}</TableCell>
                      <TableCell className="text-right">{d.weightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{d.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeLine(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="mb-1 block">Wastage %</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={wastagePercent}
                onChange={(e) => setWastagePercent(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <Label className="mb-1 block">Cutting/ Cut (₹)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={cuttingPerCut}
                onChange={(e) => setCuttingPerCut(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <Label className="mb-1 block">Cuts</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={cutsCount}
                onChange={(e) => setCutsCount(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <Label className="mb-1 block">Labor / kg (₹)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={laborPerKg}
                onChange={(e) => setLaborPerKg(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <Label className="mb-1 block">Overhead %</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={overheadPercent}
                onChange={(e) => setOverheadPercent(Number(e.target.value || 0))}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Weight is computed from each material's "weight at base length" scaled to entered ft/in.
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-base">
                  Total Weight: <span className="font-semibold ml-2">{totals.totalWeight.toFixed(2)} kg</span>
                </Badge>
                <Badge variant="outline" className="text-base">
                  Base Cost: <span className="font-semibold ml-2">₹{totals.totalCost.toFixed(2)}</span>
                </Badge>
                <Badge className="text-base">
                  Grand Total: <span className="font-semibold ml-2">₹{totals.grandTotal.toFixed(2)}</span>
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
              <div>Wastage: ₹{totals.wastageAdd.toFixed(2)}</div>
              <div>Overhead: ₹{totals.overheadAdd.toFixed(2)}</div>
              <div>Cutting: ₹{totals.cuttingAdd.toFixed(2)}</div>
              <div>Labor: ₹{totals.laborAdd.toFixed(2)}</div>
            </div>
          </div>

          {presetSummaries.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Presets Comparison</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preset</TableHead>
                      <TableHead className="text-right">Dimension (Total ft)</TableHead>
                      <TableHead className="text-right">Weight (kg)</TableHead>
                      <TableHead className="text-right">Price (Grand)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presetSummaries.map((p, idx) => (
                      <TableRow key={p.name} className={idx === 0 ? "bg-muted/40" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant={idx === 0 ? "default" : "outline"}>{p.name}</Badge>
                            {idx === 0 && <span className="text-xs text-primary">Lowest</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{p.totalFt.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{p.weight.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{p.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
