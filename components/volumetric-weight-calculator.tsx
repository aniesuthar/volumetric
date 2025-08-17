"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ShippingFees {
  local: number
  zonal: number
  national: number
}

export function VolumetricWeightCalculator() {
  const [unit, setUnit] = useState("cm")
  const [length, setLength] = useState("")
  const [breadth, setBreadth] = useState("")
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [volumetricWeight, setVolumetricWeight] = useState(0)
  const [usedWeight, setUsedWeight] = useState(0)
  const [shippingFees, setShippingFees] = useState<ShippingFees>({ local: 0, zonal: 0, national: 0 })

  const conversionFactor = 2.54

  const getConvertedValue = (value: string, fromUnit: string) => {
    if (!value) return ""
    const numValue = Number.parseFloat(value)
    if (fromUnit === "inches") {
      return (numValue * conversionFactor).toFixed(2) + " cm"
    } else {
      return (numValue / conversionFactor).toFixed(2) + " inches"
    }
  }

  const calculateShippingFee = (weight: number, type: "local" | "zonal" | "national"): number => {
    const fees = {
      local: [0, 5, 20, 10, 8, 8, 4],
      zonal: [0, 20, 20, 20, 15, 12, 5],
      national: [16, 25, 30, 20, 20, 18, 8],
    }

    const feeStructure = fees[type]

    if (weight <= 0.5) return feeStructure[0]
    if (weight <= 1) return feeStructure[0] + feeStructure[1]
    if (weight <= 1.5) return feeStructure[0] + feeStructure[1] + feeStructure[2]
    if (weight <= 2) return feeStructure[0] + feeStructure[1] + feeStructure[2] + feeStructure[3]
    if (weight <= 3) return feeStructure[0] + feeStructure[1] + feeStructure[2] + feeStructure[3] + feeStructure[4] * 2
    if (weight <= 12)
      return (
        feeStructure[0] +
        feeStructure[1] +
        feeStructure[2] +
        feeStructure[3] +
        feeStructure[4] * 2 +
        feeStructure[5] * (weight - 3)
      )
    return (
      feeStructure[0] +
      feeStructure[1] +
      feeStructure[2] +
      feeStructure[3] +
      feeStructure[4] * 2 +
      feeStructure[5] * 9 +
      feeStructure[6] * (weight - 12)
    )
  }

  useEffect(() => {
    if (length && breadth && height) {
      let lengthCm, breadthCm, heightCm

      if (unit === "inches") {
        lengthCm = Number.parseFloat(length) * conversionFactor
        breadthCm = Number.parseFloat(breadth) * conversionFactor
        heightCm = Number.parseFloat(height) * conversionFactor
      } else {
        lengthCm = Number.parseFloat(length)
        breadthCm = Number.parseFloat(breadth)
        heightCm = Number.parseFloat(height)
      }

      const volWeight = (lengthCm * breadthCm * heightCm) / 5000
      const productWeight = Number.parseFloat(weight)
      const finalWeight = Math.max(volWeight, productWeight)

      setVolumetricWeight(volWeight)
      setUsedWeight(finalWeight)

      setShippingFees({
        local: calculateShippingFee(finalWeight, "local"),
        zonal: calculateShippingFee(finalWeight, "zonal"),
        national: calculateShippingFee(finalWeight, "national"),
      })
    }
  }, [length, breadth, height, weight, unit])

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cm">CM</SelectItem>
              <SelectItem value="inches">Inches</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="length">
            Length
            {length && <span className="text-xs text-muted-foreground ml-2">({getConvertedValue(length, unit)})</span>}
          </Label>
          <Input
            id="length"
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="Enter length"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="breadth">
            Breadth
            {breadth && (
              <span className="text-xs text-muted-foreground ml-2">({getConvertedValue(breadth, unit)})</span>
            )}
          </Label>
          <Input
            id="breadth"
            type="number"
            value={breadth}
            onChange={(e) => setBreadth(e.target.value)}
            placeholder="Enter breadth"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height">
            Height
            {height && <span className="text-xs text-muted-foreground ml-2">({getConvertedValue(height, unit)})</span>}
          </Label>
          <Input
            id="height"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="Enter height"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Product Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter weight"
          />
        </div>
      </div>

      {volumetricWeight > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold">
                  Volumetric Weight: <span className="text-accent">{volumetricWeight.toFixed(2)} kg</span>
                </p>
                <div className="mt-2">
                  <Badge variant={volumetricWeight > Number.parseFloat(weight) ? "destructive" : "secondary"}>
                    Used Weight: {usedWeight.toFixed(2)} kg (
                    {volumetricWeight > Number.parseFloat(weight) ? "Volumetric" : "Product"} Weight)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {volumetricWeight > Number.parseFloat(weight)
                    ? "Volumetric weight is higher than product weight"
                    : "Product weight is higher than volumetric weight"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Local</p>
                  <p className="text-lg font-bold text-chart-1">₹{Math.round(shippingFees.local)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Zonal</p>
                  <p className="text-lg font-bold text-chart-2">₹{Math.round(shippingFees.zonal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">National</p>
                  <p className="text-lg font-bold text-chart-3">₹{Math.round(shippingFees.national)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
