"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CalculationResult {
  totalCost: number
  finalPrice: number
  amazonFees: number
  paymentGatewayFees: number
  marginPrice: number
  profitMarginRate: number
  profitMarginRateOur: number
}

export function ProfitMarginCalculator() {
  const [platform, setPlatform] = useState("amazon")
  const [inputType, setInputType] = useState("costBased")
  const [shippingMethod, setShippingMethod] = useState("selfShip")

  const [manufacturingCost, setManufacturingCost] = useState("")
  const [deliveryCost, setDeliveryCost] = useState("")
  const [marginRate, setMarginRate] = useState("")
  const [finalPriceInput, setFinalPriceInput] = useState("")
  const [amazonFeeRate, setAmazonFeeRate] = useState("15.5")
  const [paymentGatewayRate, setPaymentGatewayRate] = useState("2.5")

  const [amazonGstEnabled, setAmazonGstEnabled] = useState(true)
  const [gatewayGstEnabled, setGatewayGstEnabled] = useState(true)

  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState("")

  const parseInput = (input: string): number => {
    if (!input.trim()) return 0
    try {
      // Allow basic math expressions
      const sanitized = input.replace(/[^0-9+\-*/().]/g, "")
      const result = eval(sanitized)
      return isNaN(result) ? 0 : result
    } catch {
      return 0
    }
  }

  const getFixedFeeFromSlab = (method: string, finalPrice: number): number => {
    const slabs = {
      easyShip: [
        { max: 300, fee: 5 },
        { max: 500, fee: 10 },
        { max: 1000, fee: 33 },
        { max: Number.POSITIVE_INFINITY, fee: 64 },
      ],
      easyShipPrime: [
        { max: 300, fee: 5 },
        { max: 500, fee: 10 },
        { max: 1000, fee: 33 },
        { max: Number.POSITIVE_INFINITY, fee: 64 },
      ],
      selfShip: [
        { max: 300, fee: 45 },
        { max: 500, fee: 35 },
        { max: 1000, fee: 50 },
        { max: Number.POSITIVE_INFINITY, fee: 100 },
      ],
    }

    const shipSlabs = slabs[method as keyof typeof slabs] || slabs.selfShip
    for (const slab of shipSlabs) {
      if (finalPrice <= slab.max) return slab.fee
    }
    return 0
  }

  const calculatePrice = () => {
    setError("")

    const mCost = parseInput(manufacturingCost)
    const dCost = parseInput(deliveryCost)
    const totalCost = mCost + dCost

    if (!totalCost) {
      setResult(null)
      return
    }

    const gstRate = 0.18
    const roundToTwo = (num: number) => Math.round(num * 100) / 100

    try {
      if (platform === "personal") {
        const gwRate = parseInput(paymentGatewayRate)

        if (inputType === "costBased") {
          const mRate = parseInput(marginRate)
          const gatewayGstRate = gatewayGstEnabled ? gstRate : 0
          const totalGatewayRate = (gwRate / 100) * (1 + gatewayGstRate)
          const totalPercentage = 1 - (mRate / 100 + totalGatewayRate)

          if (totalPercentage <= 0) {
            setError("Invalid input! Total percentage cannot be negative.")
            return
          }

          const finalPrice = totalCost / totalPercentage
          const paymentGatewayFeesBase = finalPrice * (gwRate / 100)
          const paymentGatewayGst = gatewayGstEnabled ? paymentGatewayFeesBase * gstRate : 0
          const paymentGatewayFees = paymentGatewayFeesBase + paymentGatewayGst
          const marginPrice = finalPrice - paymentGatewayFees - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: 0,
            paymentGatewayFees: roundToTwo(paymentGatewayFees),
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
          })
        } else {
          const finalPrice = parseInput(finalPriceInput)
          const paymentGatewayFeesBase = finalPrice * (gwRate / 100)
          const paymentGatewayGst = gatewayGstEnabled ? paymentGatewayFeesBase * gstRate : 0
          const paymentGatewayFees = paymentGatewayFeesBase + paymentGatewayGst
          const marginPrice = finalPrice - paymentGatewayFees - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: 0,
            paymentGatewayFees: roundToTwo(paymentGatewayFees),
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
          })
        }
      } else {
        // Amazon calculations
        const aFeeRate = parseInput(amazonFeeRate)

        if (inputType === "costBased") {
          const mRate = parseInput(marginRate)
          const amazonGstRate = amazonGstEnabled ? gstRate : 0
          const totalPercentage = 1 - (mRate / 100 + aFeeRate / 100 + (amazonGstRate * aFeeRate) / 100)

          if (totalPercentage <= 0) {
            setError("Invalid input! Total percentage cannot be negative.")
            return
          }

          // Try different fixed fees to find consistent result
          const possibleFees = shippingMethod === "selfShip" ? [45, 35, 50, 100] : [5, 10, 33, 64]
          let finalPrice = 0
          let fixedClosingFee = 0

          for (const fee of possibleFees) {
            const trialPrice = (totalCost + fee + (amazonGstEnabled ? fee * gstRate : 0)) / totalPercentage
            const matchedFee = getFixedFeeFromSlab(shippingMethod, trialPrice)

            if (matchedFee === fee) {
              finalPrice = trialPrice
              fixedClosingFee = fee
              break
            }
          }

          if (!finalPrice) {
            setError("Could not resolve final price from total cost.")
            return
          }

          const amazonFeesWithoutGST = finalPrice * (aFeeRate / 100)
          const gstOnAmazonFees = amazonGstEnabled ? (amazonFeesWithoutGST + fixedClosingFee) * gstRate : 0
          const amazonFees = amazonFeesWithoutGST + fixedClosingFee + gstOnAmazonFees
          const marginPrice = finalPrice - amazonFees - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: roundToTwo(amazonFees),
            paymentGatewayFees: 0,
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
          })
        } else {
          const finalPrice = parseInput(finalPriceInput)
          const fixedClosingFee = getFixedFeeFromSlab(shippingMethod, finalPrice)
          const amazonFeesWithoutGST = finalPrice * (aFeeRate / 100)
          const gstOnAmazonFees = amazonGstEnabled ? (amazonFeesWithoutGST + fixedClosingFee) * gstRate : 0
          const amazonFees = amazonFeesWithoutGST + fixedClosingFee + gstOnAmazonFees
          const marginPrice = finalPrice - amazonFees - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: roundToTwo(amazonFees),
            paymentGatewayFees: 0,
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
          })
        }
      }
    } catch (err) {
      setError("Calculation error occurred.")
    }
  }

  useEffect(() => {
    calculatePrice()
  }, [
    platform,
    inputType,
    shippingMethod,
    manufacturingCost,
    deliveryCost,
    marginRate,
    finalPriceInput,
    amazonFeeRate,
    paymentGatewayRate,
    amazonGstEnabled,
    gatewayGstEnabled,
  ])

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <Tabs value={platform} onValueChange={setPlatform}>
        <TabsList className="w-full">
          <TabsTrigger value="amazon">Amazon</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Input Type Selection */}
      <div className="space-y-2">
        <Label>Input Type</Label>
        <Select value={inputType} onValueChange={setInputType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="costBased">Cost-Based Calculation</SelectItem>
            <SelectItem value="finalPrice">Final Price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Basic Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="manufacturingCost">Manufacturing Cost (₹)</Label>
          <Input
            type="tel"
            id="manufacturingCost"
            value={manufacturingCost}
            onChange={(e) => setManufacturingCost(e.target.value)}
            placeholder="Enter cost"
            inputMode="text"
            pattern="[0-9+\-*/.]*"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryCost">Delivery Cost (₹)</Label>
          <Input
            type="tel"
            id="deliveryCost"
            value={deliveryCost}
            onChange={(e) => setDeliveryCost(e.target.value)}
            placeholder="Enter cost"
            inputMode="text"
            pattern="[0-9+\-*/.]*"
          />
        </div>
      </div>

      {/* Conditional Inputs */}
      {inputType === "costBased" ? (
        <div className="space-y-2">
          <Label htmlFor="marginRate">
            Profit Margin Rate (%){" "}
            {platform === "amazon" && <span className="text-xs text-muted-foreground">(Amazon)</span>}
          </Label>
          <Input
            type="tel"
            id="marginRate"
            value={marginRate}
            onChange={(e) => setMarginRate(e.target.value)}
            placeholder="Enter margin rate"
            inputMode="text"
            pattern="[0-9+\-*/.]*"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="finalPriceInput">Final Price (₹)</Label>
          <Input
            type="tel"
            id="finalPriceInput"
            value={finalPriceInput}
            onChange={(e) => setFinalPriceInput(e.target.value)}
            placeholder="Enter final price"
            inputMode="text"
            pattern="[0-9+\-*/.]*"
          />
        </div>
      )}

      {/* Platform-specific inputs */}
      {platform === "amazon" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="amazonFeeRate">
              Amazon Fee Rate (%) <span className="text-xs text-muted-foreground">(15.5% for furniture)</span>
            </Label>
            <Input
              type="tel" id="amazonFeeRate" value={amazonFeeRate} onChange={(e) => setAmazonFeeRate(e.target.value)} />
            <div className="flex items-center space-x-2">
              <Switch id="amazonGst" checked={amazonGstEnabled} onCheckedChange={setAmazonGstEnabled} />
              <Label htmlFor="amazonGst" className="text-sm">
                Include 18% GST on Amazon Fees
              </Label>
            </div>
          </div>

          {/* Shipping Method Selection */}
          <Tabs value={shippingMethod} onValueChange={setShippingMethod}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="selfShip">Self Ship</TabsTrigger>
              <TabsTrigger value="easyShip">Easy Ship</TabsTrigger>
              <TabsTrigger value="easyShipPrime">Easy Ship Prime</TabsTrigger>
            </TabsList>
          </Tabs>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="paymentGatewayRate">
            Payment Gateway Fee (%) <span className="text-xs text-muted-foreground">(2-3% typical)</span>
          </Label>
          <Input
            type="tel"
            id="paymentGatewayRate"
            value={paymentGatewayRate}
            onChange={(e) => setPaymentGatewayRate(e.target.value)}
            inputMode="text"
            pattern="[0-9+\-*/.]*"
          />
          <div className="flex items-center space-x-2">
            <Switch id="gatewayGst" checked={gatewayGstEnabled} onCheckedChange={setGatewayGstEnabled} />
            <Label htmlFor="gatewayGst" className="text-sm">
              Include 18% GST on Gateway Fees
            </Label>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && <div className="text-destructive text-sm font-medium">{error}</div>}

      {/* Results */}
      {result && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-bold">₹{result.totalCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Final Price</p>
                  <p className="text-lg font-bold text-chart-1">₹{result.finalPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {platform === "amazon" ? (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Amazon Fees</p>
                    <p className="text-lg font-bold text-destructive">₹{result.amazonFees.toFixed(2)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gateway Fees</p>
                    <p className="text-lg font-bold text-destructive">₹{result.paymentGatewayFees.toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pure Profit</p>
                  <p className="text-lg font-bold text-chart-4">₹{result.marginPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Margin % {platform === "amazon" && "(From Amazon)"}
                  </p>
                  <Badge variant="secondary">{result.profitMarginRate.toFixed(2)}%</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Margin % (On Our Cost)</p>
                  <Badge variant="outline">{result.profitMarginRateOur.toFixed(2)}%</Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Calculation</p>
                <p className="text-sm font-mono">
                  <span className="text-chart-1">₹{result.finalPrice.toFixed(2)}</span> -
                  <span className="text-destructive">
                    {" "}
                    ₹{(platform === "amazon" ? result.amazonFees : result.paymentGatewayFees).toFixed(2)}
                  </span>{" "}
                  -<span className="text-foreground"> ₹{result.totalCost.toFixed(2)}</span> =
                  <span className="text-chart-4"> ₹{result.marginPrice.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
