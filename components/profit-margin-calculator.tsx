"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAmazonClosingFee, getPossibleClosingFees, type ShippingMethod } from "@/lib/amazon-closing-fees"

interface CalculationResult {
  totalCost: number
  finalPrice: number
  amazonFees: number
  paymentGatewayFees: number
  productGst: number
  marginPrice: number
  profitMarginRate: number
  profitMarginRateOur: number
  amazonFeesBreakdown?: {
    percentageFee: number
    fixedFee: number
    gstOnFees: number
  }
}

interface ComparisonResult {
  amazon: CalculationResult
  personal: CalculationResult
  optimalPersonalPrice: number
  priceDifference: number
  percentageSavings: number
}

export function ProfitMarginCalculator() {
  const [platform, setPlatform] = useState("amazon")
  const [inputType, setInputType] = useState("finalPrice")
  const [shippingMethod, setShippingMethod] = useState("selfShip")

  const [manufacturingCost, setManufacturingCost] = useState("")
  const [deliveryCost, setDeliveryCost] = useState("")
  const [marginRate, setMarginRate] = useState("")
  const [finalPriceInput, setFinalPriceInput] = useState("")
  const [amazonFeeRate, setAmazonFeeRate] = useState("15.5")
  const [paymentGatewayRate, setPaymentGatewayRate] = useState("2.5")
  const [productGstRate, setProductGstRate] = useState("18")

  const [amazonGstEnabled, setAmazonGstEnabled] = useState(true)
  const [gatewayGstEnabled, setGatewayGstEnabled] = useState(true)
  const [productGstEnabled, setProductGstEnabled] = useState(true)

  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState("")
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)

  const parseInput = (input: string): number => {
    if (!input.trim()) return 0
    try {
      const sanitized = input.replace(/[^0-9+\-*/().]/g, "")
      const result = eval(sanitized)
      return isNaN(result) ? 0 : result
    } catch {
      return 0
    }
  }



  const calculateComparison = (): ComparisonResult | null => {
    const mCost = parseInput(manufacturingCost)
    const dCost = parseInput(deliveryCost)
    const totalCost = mCost + dCost

    if (!totalCost) return null

    const gstRate = 0.18
    const roundToTwo = (num: number) => Math.round(num * 100) / 100
    const aFeeRate = parseInput(amazonFeeRate)
    const gwRate = parseInput(paymentGatewayRate)
    const prodGstRate = productGstEnabled ? parseInput(productGstRate) / 100 : 0

    try {
      let amazonResult: CalculationResult
      let personalResult: CalculationResult

      if (inputType === "costBased") {
        const mRate = parseInput(marginRate)
        if (!mRate) return null

        const amazonGstRate = amazonGstEnabled ? gstRate : 0
        const totalPercentageAmazon = 1 - (mRate / 100 + aFeeRate / 100 + (amazonGstRate * aFeeRate) / 100)

        if (totalPercentageAmazon <= 0) return null

        const possibleFees = getPossibleClosingFees(shippingMethod as ShippingMethod)
        let amazonFinalPrice = 0
        let fixedClosingFee = 0

        for (const fee of possibleFees) {
          const trialPrice = (totalCost + fee + (amazonGstEnabled ? fee * gstRate : 0)) / totalPercentageAmazon
          const matchedFee = getAmazonClosingFee(shippingMethod as ShippingMethod, trialPrice)

          if (matchedFee === fee) {
            amazonFinalPrice = trialPrice
            fixedClosingFee = fee
            break
          }
        }

        if (!amazonFinalPrice) return null

        const amazonFeesWithoutGST = amazonFinalPrice * (aFeeRate / 100)
        const gstOnAmazonFees = amazonGstEnabled ? (amazonFeesWithoutGST + fixedClosingFee) * gstRate : 0
        const amazonFees = amazonFeesWithoutGST + fixedClosingFee + gstOnAmazonFees
        const amazonReceivable = amazonFinalPrice - amazonFees
        const ourMoney = amazonReceivable / (1 + prodGstRate)
        const amazonProductGst = amazonReceivable - ourMoney
        const amazonMarginPrice = ourMoney - totalCost

        amazonResult = {
          totalCost,
          finalPrice: roundToTwo(amazonFinalPrice),
          amazonFees: roundToTwo(amazonFees),
          paymentGatewayFees: 0,
          productGst: roundToTwo(amazonProductGst),
          marginPrice: roundToTwo(amazonMarginPrice),
          profitMarginRate: roundToTwo((amazonMarginPrice / amazonFinalPrice) * 100),
          profitMarginRateOur: roundToTwo((amazonMarginPrice / totalCost) * 100),
        }

        const gatewayGstRate = gatewayGstEnabled ? gstRate : 0
        const totalGatewayRate = (gwRate / 100) * (1 + gatewayGstRate)
        const totalPercentagePersonal = 1 - (mRate / 100 + totalGatewayRate)

        if (totalPercentagePersonal <= 0) return null

        const personalFinalPrice = totalCost / totalPercentagePersonal
        const paymentGatewayFeesBase = personalFinalPrice * (gwRate / 100)
        const paymentGatewayGst = gatewayGstEnabled ? paymentGatewayFeesBase * gstRate : 0
        const paymentGatewayFees = paymentGatewayFeesBase + paymentGatewayGst
        const personalReceivable = personalFinalPrice - paymentGatewayFees
        const ourMoneyPersonal = personalReceivable / (1 + prodGstRate)
        const personalProductGst = personalReceivable - ourMoneyPersonal
        const personalMarginPrice = ourMoneyPersonal - totalCost

        personalResult = {
          totalCost,
          finalPrice: roundToTwo(personalFinalPrice),
          amazonFees: 0,
          paymentGatewayFees: roundToTwo(paymentGatewayFees),
          productGst: roundToTwo(personalProductGst),
          marginPrice: roundToTwo(personalMarginPrice),
          profitMarginRate: roundToTwo((personalMarginPrice / personalFinalPrice) * 100),
          profitMarginRateOur: roundToTwo((personalMarginPrice / totalCost) * 100),
        }
      } else {
        const finalPrice = parseInput(finalPriceInput)
        if (!finalPrice) return null

        const fixedClosingFee = getAmazonClosingFee(shippingMethod as ShippingMethod, finalPrice)
        const amazonFeesWithoutGST = finalPrice * (aFeeRate / 100)
        const gstOnAmazonFees = amazonGstEnabled ? (amazonFeesWithoutGST + fixedClosingFee) * gstRate : 0
        const amazonFees = amazonFeesWithoutGST + fixedClosingFee + gstOnAmazonFees
        const amazonReceivable = finalPrice - amazonFees
        const ourMoney = amazonReceivable / (1 + prodGstRate)
        const amazonProductGst = amazonReceivable - ourMoney
        const amazonMarginPrice = ourMoney - totalCost

        amazonResult = {
          totalCost,
          finalPrice: roundToTwo(finalPrice),
          amazonFees: roundToTwo(amazonFees),
          paymentGatewayFees: 0,
          productGst: roundToTwo(amazonProductGst),
          marginPrice: roundToTwo(amazonMarginPrice),
          profitMarginRate: roundToTwo((amazonMarginPrice / finalPrice) * 100),
          profitMarginRateOur: roundToTwo((amazonMarginPrice / totalCost) * 100),
        }

        const paymentGatewayFeesBase = finalPrice * (gwRate / 100)
        const paymentGatewayGst = gatewayGstEnabled ? paymentGatewayFeesBase * gstRate : 0
        const paymentGatewayFees = paymentGatewayFeesBase + paymentGatewayGst
        const personalReceivable = finalPrice - paymentGatewayFees
        const ourMoneyPersonal = personalReceivable / (1 + prodGstRate)
        const personalProductGst = personalReceivable - ourMoneyPersonal
        const personalMarginPrice = ourMoneyPersonal - totalCost

        personalResult = {
          totalCost,
          finalPrice: roundToTwo(finalPrice),
          amazonFees: 0,
          paymentGatewayFees: roundToTwo(paymentGatewayFees),
          productGst: roundToTwo(personalProductGst),
          marginPrice: roundToTwo(personalMarginPrice),
          profitMarginRate: roundToTwo((personalMarginPrice / finalPrice) * 100),
          profitMarginRateOur: roundToTwo((personalMarginPrice / totalCost) * 100),
        }
      }

      const targetProfit = amazonResult.marginPrice
      const gatewayGstRate = gatewayGstEnabled ? gstRate : 0
      const totalGatewayRate = (gwRate / 100) * (1 + gatewayGstRate)
      const optimalPersonalPrice = (totalCost + targetProfit) / (1 - totalGatewayRate)

      const priceDifference = amazonResult.finalPrice - optimalPersonalPrice
      const percentageSavings = (priceDifference / amazonResult.finalPrice) * 100

      return {
        amazon: amazonResult,
        personal: personalResult,
        optimalPersonalPrice: roundToTwo(optimalPersonalPrice),
        priceDifference: roundToTwo(priceDifference),
        percentageSavings: roundToTwo(percentageSavings),
      }
    } catch {
      return null
    }
  }

  const calculatePrice = () => {
    setError("")

    const mCost = parseInput(manufacturingCost)
    const dCost = parseInput(deliveryCost)
    const totalCost = mCost + dCost

    if (!totalCost) {
      setResult(null)
      setComparison(null)
      return
    }

    const gstRate = 0.18
    const roundToTwo = (num: number) => Math.round(num * 100) / 100
    const prodGstRate = productGstEnabled ? parseInput(productGstRate) / 100 : 0

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
          const personalReceivable = finalPrice - paymentGatewayFees
          const ourMoney = personalReceivable / (1 + prodGstRate)
          const productGst = personalReceivable - ourMoney
          const marginPrice = ourMoney - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: 0,
            paymentGatewayFees: roundToTwo(paymentGatewayFees),
            productGst: roundToTwo(productGst),
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
          })
        } else {
          const finalPrice = parseInput(finalPriceInput)
          const paymentGatewayFeesBase = finalPrice * (gwRate / 100)
          const paymentGatewayGst = gatewayGstEnabled ? paymentGatewayFeesBase * gstRate : 0
          const paymentGatewayFees = paymentGatewayFeesBase + paymentGatewayGst
          const personalReceivable = finalPrice - paymentGatewayFees
          const ourMoney = personalReceivable / (1 + prodGstRate)
          const productGst = personalReceivable - ourMoney
          const marginPrice = ourMoney - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: 0,
            paymentGatewayFees: roundToTwo(paymentGatewayFees),
            productGst: roundToTwo(productGst),
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
          })
        }
      } else {
        const aFeeRate = parseInput(amazonFeeRate)

        if (inputType === "costBased") {
          const mRate = parseInput(marginRate)
          const amazonGstRate = amazonGstEnabled ? gstRate : 0
          const totalPercentage = 1 - (mRate / 100 + aFeeRate / 100 + (amazonGstRate * aFeeRate) / 100)

          if (totalPercentage <= 0) {
            setError("Invalid input! Total percentage cannot be negative.")
            return
          }

          const possibleFees = getPossibleClosingFees(shippingMethod as ShippingMethod)
          let finalPrice = 0
          let fixedClosingFee = 0

          for (const fee of possibleFees) {
            const trialPrice = (totalCost + fee + (amazonGstEnabled ? fee * gstRate : 0)) / totalPercentage
            const matchedFee = getAmazonClosingFee(shippingMethod as ShippingMethod, trialPrice)

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
          const amazonReceivable = finalPrice - amazonFees
          const ourMoney = amazonReceivable / (1 + prodGstRate)
          const productGst = amazonReceivable - ourMoney
          const marginPrice = ourMoney - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: roundToTwo(amazonFees),
            paymentGatewayFees: 0,
            productGst: roundToTwo(productGst),
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
            amazonFeesBreakdown: {
              percentageFee: roundToTwo(amazonFeesWithoutGST),
              fixedFee: fixedClosingFee,
              gstOnFees: roundToTwo(gstOnAmazonFees),
            },
          })
        } else {
          const finalPrice = parseInput(finalPriceInput)
          const fixedClosingFee = getAmazonClosingFee(shippingMethod as ShippingMethod, finalPrice)
          const amazonFeesWithoutGST = finalPrice * (aFeeRate / 100)
          const gstOnAmazonFees = amazonGstEnabled ? (amazonFeesWithoutGST + fixedClosingFee) * gstRate : 0
          const amazonFees = amazonFeesWithoutGST + fixedClosingFee + gstOnAmazonFees
          const amazonReceivable = finalPrice - amazonFees
          const ourMoney = amazonReceivable / (1 + prodGstRate)
          const productGst = amazonReceivable - ourMoney
          const marginPrice = ourMoney - totalCost

          setResult({
            totalCost,
            finalPrice: roundToTwo(finalPrice),
            amazonFees: roundToTwo(amazonFees),
            paymentGatewayFees: 0,
            productGst: roundToTwo(productGst),
            marginPrice: roundToTwo(marginPrice),
            profitMarginRate: roundToTwo((marginPrice / finalPrice) * 100),
            profitMarginRateOur: roundToTwo((marginPrice / totalCost) * 100),
            amazonFeesBreakdown: {
              percentageFee: roundToTwo(amazonFeesWithoutGST),
              fixedFee: fixedClosingFee,
              gstOnFees: roundToTwo(gstOnAmazonFees),
            },
          })
        }
      }

      const comparisonResult = calculateComparison()
      setComparison(comparisonResult)
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
    productGstRate,
    productGstEnabled,
  ])

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Tabs value={platform} onValueChange={setPlatform}>
          <TabsList className="w-full">
            <TabsTrigger value="amazon">Amazon</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
          </TabsList>
        </Tabs>

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

        {inputType === "costBased" ? (
          <div className="space-y-2">
            <Label htmlFor="marginRate">
              Profit Margin Rate (%){" "}
              {platform === "amazon" && <span className="text-xs text-muted-foreground">(Amazon)</span>}
            </Label>
            <Input
              type="number"
              id="marginRate"
              value={marginRate}
              onChange={(e) => setMarginRate(e.target.value)}
              placeholder="Enter margin rate"
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

        {platform === "amazon" ? (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amazonFeeRate">
                  Amazon Fee Rate (%) <span className="text-xs text-muted-foreground">(15.5% for furniture)</span>
                </Label>
                <Input
                  type="number"
                  id="amazonFeeRate"
                  value={amazonFeeRate}
                  onChange={(e) => setAmazonFeeRate(e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  <Switch id="amazonGst" checked={amazonGstEnabled} onCheckedChange={setAmazonGstEnabled} />
                  <Label htmlFor="amazonGst" className="text-sm">
                    Include 18% GST on Amazon Fees
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productGstRate">
                  Product GST (%) <span className="text-xs text-muted-foreground">(Tax on product price)</span>
                </Label>
                <Input
                  type="number"
                  id="productGstRate"
                  value={productGstRate}
                  onChange={(e) => setProductGstRate(e.target.value)}
                  placeholder="Enter GST percentage"
                />
                <div className="flex items-center space-x-2">
                  <Switch id="productGst" checked={productGstEnabled} onCheckedChange={setProductGstEnabled} />
                  <Label htmlFor="productGst" className="text-sm">
                    Include 18% GST on Product
                  </Label>
                </div>
              </div>
            </div>

            <Tabs value={shippingMethod} onValueChange={setShippingMethod}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="selfShip">Self Ship</TabsTrigger>
                <TabsTrigger value="easyShip">Easy Ship</TabsTrigger>
                <TabsTrigger value="easyShipPrime">Easy Ship Prime</TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentGatewayRate">
                Payment Gateway Fee (%) <span className="text-xs text-muted-foreground">(2-3% typical)</span>
              </Label>
              <Input
                type="number"
                id="paymentGatewayRate"
                value={paymentGatewayRate}
                onChange={(e) => setPaymentGatewayRate(e.target.value)}
              />
              <div className="flex items-center space-x-2">
                <Switch id="gatewayGst" checked={gatewayGstEnabled} onCheckedChange={setGatewayGstEnabled} />
                <Label htmlFor="gatewayGst" className="text-sm">
                  Include 18% GST on Gateway Fees
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productGstRate">
                Product GST (%) <span className="text-xs text-muted-foreground">(Tax on product price)</span>
              </Label>
              <Input
                type="number"
                id="productGstRate"
                value={productGstRate}
                onChange={(e) => setProductGstRate(e.target.value)}
                placeholder="Enter GST percentage"
              />
              <div className="flex items-center space-x-2">
                <Switch id="productGst" checked={productGstEnabled} onCheckedChange={setProductGstEnabled} />
                <Label htmlFor="productGst" className="text-sm">
                  Include 18% GST on Product
                </Label>
              </div>
            </div>
          </div>
        )}

        {error && <div className="text-destructive text-sm font-medium">{error}</div>}


        {result && (
          <Card className="bg-muted/50">
            <CardContent>
              <div className="space-y-4">
                {/* First Row: Final Price & Total Cost */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Final Price</p>
                    <p className="price text-chart-1">₹{result.finalPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                    <p className="price">₹{result.totalCost.toFixed(2)}</p>
                  </div>
                </div>

                {/* Second Row: Platform Fees & Product GST */}
                <div className={`grid ${platform === "amazon" ? "grid-cols-2" : "grid-cols-2"} gap-4`}>
                  {platform === "amazon" ? (
                    <>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Amazon Fees
                          {result && result.amazonFeesBreakdown && (
                            <div className="text-xs text-muted-foreground/60 mt-1">
                              ₹{result.amazonFeesBreakdown.percentageFee.toFixed(2)} (Rate) + ₹
                              {result.amazonFeesBreakdown.fixedFee} (Fixed) + ₹
                              {result.amazonFeesBreakdown.gstOnFees.toFixed(2)} (GST)
                            </div>
                          )}
                        </div>
                        <p className="price text-destructive">₹{result.amazonFees.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Product GST ({productGstRate}%)</p>
                        <p className="price text-destructive">₹{result.productGst.toFixed(2)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Gateway Fees</p>
                        <p className="price text-destructive">₹{result.paymentGatewayFees.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Product GST ({productGstRate}%)</p>
                        <p className="price text-destructive">₹{result.productGst.toFixed(2)}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Third Row: Receivable & Pure Profit */}
                <div className="grid grid-cols-2 gap-4">
                  {platform === "amazon" ? (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Amazon Receivable</p>
                      <p className="price text-yellow-600">₹{(result.finalPrice - result.amazonFees).toFixed(2)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Receivable</p>
                      <p className="price text-yellow-600">₹{(result.finalPrice - result.paymentGatewayFees).toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pure Profit</p>
                    <p className="price text-chart-4">₹{result.marginPrice.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Margin % (on Sale Price)</p>
                    <Badge
                      variant="outline"
                      className={
                        result.profitMarginRate >= 12
                          ? "border-green-600 text-green-600"
                          : result.profitMarginRate >= 8
                            ? "border-yellow-600 text-yellow-600"
                            : "border-red-600 text-red-600"
                      }
                    >
                      {result.profitMarginRate >= 12 ? "✓ " : result.profitMarginRate >= 8 ? "~ " : "✗ "}
                      {result.profitMarginRate.toFixed(2)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.profitMarginRate >= 12 ? "Good" : result.profitMarginRate >= 8 ? "Average" : "Low"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Margin % (on Factory Price)</p>
                    <Badge
                      variant="outline"
                      className={
                        result.profitMarginRateOur >= 25
                          ? "border-green-600 text-green-600"
                          : result.profitMarginRateOur >= 18
                            ? "border-yellow-600 text-yellow-600"
                            : "border-red-600 text-red-600"
                      }
                    >
                      {result.profitMarginRateOur >= 25 ? "✓ " : result.profitMarginRateOur >= 18 ? "~ " : "✗ "}
                      {result.profitMarginRateOur.toFixed(2)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.profitMarginRateOur >= 25 ? "Good" : result.profitMarginRateOur >= 18 ? "Average" : "Low"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Margin % (Before GST)</p>
                    <Badge
                      variant="outline"
                      className={
                        (((result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees) - result.totalCost) / result.totalCost) * 100) >= 45
                          ? "border-green-600 text-green-600"
                          : (((result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees) - result.totalCost) / result.totalCost) * 100) >= 35
                            ? "border-yellow-600 text-yellow-600"
                            : "border-red-600 text-red-600"
                      }
                    >
                      {(((result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees) - result.totalCost) / result.totalCost) * 100) >= 45
                        ? "✓ "
                        : (((result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees) - result.totalCost) / result.totalCost) * 100) >= 35
                          ? "~ "
                          : "✗ "}
                      {(((result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees) - result.totalCost) / result.totalCost) * 100).toFixed(2)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(((result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees) - result.totalCost) / result.totalCost) * 100) >= 45
                        ? "Good"
                        : (((result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees) - result.totalCost) / result.totalCost) * 100) >= 35
                          ? "Average"
                          : "Low"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Calculation</p>
                  <p className="text-sm font-mono leading-relaxed">
                    <span className="text-muted-foreground">Receivable:</span>{" "}
                    <span className="text-chart-1">₹{result.finalPrice.toFixed(2)}</span> -
                    <span className="text-destructive">
                      {" "}
                      ₹{(platform === "amazon" ? result.amazonFees : result.paymentGatewayFees).toFixed(2)}
                    </span>{" "}
                    = <span className="text-yellow-600">₹{(result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees)).toFixed(2)}</span>
                    <br />
                    <span className="text-muted-foreground">Our Money:</span>{" "}
                    <span className="text-yellow-600">₹{(result.finalPrice - (platform === "amazon" ? result.amazonFees : result.paymentGatewayFees)).toFixed(2)}</span> -
                    <span className="text-destructive"> ₹{result.productGst.toFixed(2)} (GST)</span> -
                    <span className="text-foreground"> ₹{result.totalCost.toFixed(2)}</span> =
                    <span className="text-chart-4"> ₹{result.marginPrice.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {comparison && (
        <div className="space-y-6">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">Platform Comparison</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Amazon</TableHead>
                    <TableHead>Personal</TableHead>
                    <TableHead>Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Final Price</TableCell>
                    <TableCell className="font-gilroy font-medium">₹{comparison.amazon.finalPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-gilroy font-medium">₹{comparison.personal.finalPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-gilroy font-medium">
                      ₹{Math.abs(comparison.amazon.finalPrice - comparison.personal.finalPrice).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Platform Fees</TableCell>
                    <TableCell className="font-gilroy font-medium">₹{comparison.amazon.amazonFees.toFixed(2)}</TableCell>
                    <TableCell className="font-gilroy font-medium">₹{comparison.personal.paymentGatewayFees.toFixed(2)}</TableCell>
                    <TableCell className="font-gilroy font-medium">
                      ₹{Math.abs(comparison.amazon.amazonFees - comparison.personal.paymentGatewayFees).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Pure Profit</TableCell>
                    <TableCell className="font-gilroy font-medium">₹{comparison.amazon.marginPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-gilroy font-medium">₹{comparison.personal.marginPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-gilroy font-medium">
                      ₹{Math.abs(comparison.amazon.marginPrice - comparison.personal.marginPrice).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Margin % (Sale Price)</TableCell>
                    <TableCell className="font-gilroy font-medium">{comparison.amazon.profitMarginRate.toFixed(2)}%</TableCell>
                    <TableCell className="font-gilroy font-medium">{comparison.personal.profitMarginRate.toFixed(2)}%</TableCell>
                    <TableCell className="font-gilroy font-medium">
                      {Math.abs(comparison.amazon.profitMarginRate - comparison.personal.profitMarginRate).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Margin % (Factory Price)</TableCell>
                    <TableCell className="font-gilroy font-medium">{comparison.amazon.profitMarginRateOur.toFixed(2)}%</TableCell>
                    <TableCell className="font-gilroy font-medium">{comparison.personal.profitMarginRateOur.toFixed(2)}%</TableCell>
                    <TableCell className="font-gilroy font-medium">
                      {Math.abs(comparison.amazon.profitMarginRateOur - comparison.personal.profitMarginRateOur).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="bg-chart-4/10 border-chart-4/40 ">
            <CardContent>
              <h3 className="text-lg font-semibold mb-4 ">Price Optimizer</h3>
              <div className="space-y-3 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Optimal Personal Price:</span>
                  <span className="price text-chart-4">
                    ₹{comparison.optimalPersonalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Price Reduction:</span>
                  <span className="price">₹{comparison.priceDifference.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium ">Customer Savings:</span>
                  <Badge variant="outline" className="text-chart-4 border-chart-4">
                    {comparison.percentageSavings.toFixed(1)}%
                  </Badge>
                </div>
                <div className="pt-3 border-t border-chart-4/60">
                  <p className="text-xs text-chart-4">
                    💡 To maintain the same profit as Amazon <b>(₹{comparison.amazon.marginPrice.toFixed(2)})</b>, you can
                    price your product at <strong> ₹{comparison.optimalPersonalPrice.toFixed(2)}</strong> on your personal website, giving
                    customers <b>{comparison.percentageSavings.toFixed(1)}%</b> savings!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
