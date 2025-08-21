"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Settings, Save, ContrastIcon as Compare, Trash2, RefreshCw, MapPin } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface CourierRate {
  courier_partner_id: number
  courier_name: string
  courier_type: string
  zone: string
  tat: number
  weight: {
    applied_weight: number
    dead_weight: number
    volumetric_weight: number
  }
  total_shipping_charges: number
  freight_charge: number
  cod_charge: number
}

interface ApiResponse {
  data: Array<{
    courier_rate_card: CourierRate[]
  }>
  success: boolean
  message: string
}

interface SavedDimension {
  id: string
  name: string
  length: string
  breadth: string
  height: string
  weight: string
  unit: string
  volumetricWeight: number
  usedWeight: number
  bestRate?: CourierRate
}

interface PincodeDetails {
  pinId: number
  pinCode: number
  cityId: number
  cityName: string
  stateId: number
  state: string
}

interface PincodeResponse {
  data: PincodeDetails
  success: boolean
  message: string
  responseCode: number
}

export function VolumetricWeightCalculator() {
  const [unit, setUnit] = useState("cm")
  const [length, setLength] = useState("")
  const [breadth, setBreadth] = useState("")
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [convertValues, setConvertValues] = useState(true)
  const [volumetricWeight, setVolumetricWeight] = useState(0)
  const [usedWeight, setUsedWeight] = useState(0)
  const [courierRates, setCourierRates] = useState<CourierRate[]>([])
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [ratesError, setRatesError] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [accessKeyId, setAccessKeyId] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [userId, setUserId] = useState("7942376")
  const [savedDimensions, setSavedDimensions] = useState<SavedDimension[]>([])
  const [compareMode, setCompareMode] = useState(true)
  const [paymentType, setPaymentType] = useState("Prepaid")
  const [shipmentCategory, setShipmentCategory] = useState("B2C")

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

  const handleUnitChange = (newUnit: string) => {
    if (unit !== newUnit) {
      if (convertValues && (length || breadth || height)) {
        // Convert values when switching units
        if (unit === "cm" && newUnit === "inches") {
          if (length) setLength((Number.parseFloat(length) / conversionFactor).toFixed(2))
          if (breadth) setBreadth((Number.parseFloat(breadth) / conversionFactor).toFixed(2))
          if (height) setHeight((Number.parseFloat(height) / conversionFactor).toFixed(2))
        } else if (unit === "inches" && newUnit === "cm") {
          if (length) setLength((Number.parseFloat(length) * conversionFactor).toFixed(2))
          if (breadth) setBreadth((Number.parseFloat(breadth) * conversionFactor).toFixed(2))
          if (height) setHeight((Number.parseFloat(height) * conversionFactor).toFixed(2))
        }
      }
      // If convertValues is false, we keep the same numeric values and just change the unit
      setUnit(newUnit)
    }
  }

  const fetchShippingRates = async () => {
    setRatesError("")

    if (!length || !breadth || !height || !weight || !pickupPincode || !destinationPincode || !invoiceAmount) {
      return
    }

    if (!accessKeyId || !authToken || !userId) {
      setRatesError("Please configure API credentials in settings")
      return
    }


    if (!pickupDetails || !destinationDetails) {
      setRatesError("Please ensure both pickup and destination pincodes are valid")
      return
    }


    setIsLoadingRates(true)


    try {
      let lengthCm, breadthCm, heightCm

      if (unit === "inches") {
        lengthCm = Math.round(Number.parseFloat(length) * conversionFactor)
        breadthCm = Math.round(Number.parseFloat(breadth) * conversionFactor)
        heightCm = Math.round(Number.parseFloat(height) * conversionFactor)
      } else {
        lengthCm = Number.parseFloat(length)
        breadthCm = Number.parseFloat(breadth)
        heightCm = Number.parseFloat(height)
      }

      const payload = {
        user_id: Number.parseInt(userId),
        shipment_category: shipmentCategory,
        payment_type: paymentType,
        pickup_pincode: Number.parseInt(pickupPincode),
        destination_pincode: Number.parseInt(destinationPincode),
        shipment_invoice_amount: Number.parseInt(invoiceAmount),
        riskType: "",
        box_details: [
          {
            each_box_dead_weight: Number.parseFloat(weight),
            each_box_length: lengthCm,
            each_box_width: breadthCm,
            each_box_height: heightCm,
            box_count: 1,
          },
        ],
      }

      const response = await fetch("https://appapinew.bigship.in/api/RateCalculate/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_key_id: accessKeyId,
          authorization: authToken,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      if (data.success && data.data && data.data[0]) {
        const sortedRates = data.data[0].courier_rate_card.sort(
          (a, b) => a.total_shipping_charges - b.total_shipping_charges,
        )
        setCourierRates(sortedRates)
      } else {
        throw new Error(data.message || "Failed to fetch rates")
      }
    } catch (error) {
      console.error("Error fetching shipping rates:", error)
      setRatesError(error instanceof Error ? error.message : "Failed to fetch shipping rates")
    } finally {
      setIsLoadingRates(false)
    }
  }

  const saveCurrentDimension = () => {
    if (!length || !breadth || !height || !weight) return

    const nextLetter = String.fromCharCode(65 + savedDimensions.length) // A, B, C, etc.

    const newDimension: SavedDimension = {
      id: Date.now().toString(),
      name: nextLetter,
      length,
      breadth,
      height,
      weight,
      unit,
      volumetricWeight,
      usedWeight,
      bestRate: courierRates.length > 0 ? courierRates[0] : undefined,
    }

    const updated = [...savedDimensions, newDimension]
    setSavedDimensions(updated)
    localStorage.setItem("saved_dimensions", JSON.stringify(updated))
  }

  const deleteSavedDimension = (id: string) => {
    const updated = savedDimensions.filter((dim) => dim.id !== id)
    setSavedDimensions(updated)
    localStorage.setItem("saved_dimensions", JSON.stringify(updated))
  }

  const loadDimension = (dimension: SavedDimension) => {
    setLength(dimension.length)
    setBreadth(dimension.breadth)
    setHeight(dimension.height)
    setWeight(dimension.weight)
    setUnit(dimension.unit)
  }

  useEffect(() => {
    const savedAccessKey = localStorage.getItem("bigship_access_key")
    const savedAuthToken = localStorage.getItem("bigship_auth_token")
    const savedUserId = localStorage.getItem("bigship_user_id")
    const savedDims = localStorage.getItem("saved_dimensions")

    if (savedAccessKey) setAccessKeyId(savedAccessKey)
    if (savedAuthToken) setAuthToken(savedAuthToken)
    if (savedUserId) setUserId(savedUserId)
    if (savedDims) setSavedDimensions(JSON.parse(savedDims))
  }, [])

  const saveCredentials = () => {
    localStorage.setItem("bigship_access_key", accessKeyId)
    localStorage.setItem("bigship_auth_token", authToken)
    localStorage.setItem("bigship_user_id", userId)
    setIsSettingsOpen(false)
  }

  const [pickupPincode, setPickupPincode] = useState("331803")
  const [destinationPincode, setDestinationPincode] = useState("400001")
  const [invoiceAmount, setInvoiceAmount] = useState("800")
  const [pickupDetails, setPickupDetails] = useState<PincodeDetails | null>(null)
  const [destinationDetails, setDestinationDetails] = useState<PincodeDetails | null>(null)
  const [isValidatingPickup, setIsValidatingPickup] = useState(false)
  const [isValidatingDestination, setIsValidatingDestination] = useState(false)
  const [pickupError, setPickupError] = useState("")
  const [destinationError, setDestinationError] = useState("")

  const validatePincode = async (pincode: string, type: "pickup" | "destination") => {
    if (!pincode || pincode.length !== 6) return

    if (!accessKeyId || !authToken) {
      const error = "Please configure API credentials to validate pincode"
      if (type === "pickup") setPickupError(error)
      else setDestinationError(error)
      return
    }

    const setLoading = type === "pickup" ? setIsValidatingPickup : setIsValidatingDestination
    const setError = type === "pickup" ? setPickupError : setDestinationError
    const setDetails = type === "pickup" ? setPickupDetails : setDestinationDetails

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`https://appapinew.bigship.in/api/userprofile/GetPincodeDetails/${pincode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          access_key_id: accessKeyId,
          authorization: authToken,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: PincodeResponse = await response.json()

      if (data.success && data.responseCode === 200) {
        setDetails(data.data)
        console.log(`[v0] ${type} pincode validated:`, data.data)
      } else {
        throw new Error(data.message || "Invalid pincode")
      }
    } catch (error) {
      console.error(`Error validating ${type} pincode:`, error)
      setError(error instanceof Error ? error.message : `Failed to validate ${type} pincode`)
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickupPincode && pickupPincode.length === 6) {
        validatePincode(pickupPincode, "pickup")
      } else {
        setPickupDetails(null)
        setPickupError("")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [pickupPincode, accessKeyId, authToken])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (destinationPincode && destinationPincode.length === 6) {
        validatePincode(destinationPincode, "destination")
      } else {
        setDestinationDetails(null)
        setDestinationError("")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [destinationPincode, accessKeyId, authToken])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        length &&
        breadth &&
        height &&
        weight &&
        pickupPincode &&
        destinationPincode &&
        invoiceAmount &&
        accessKeyId &&
        authToken &&
        pickupDetails &&
        destinationDetails
      ) {
        console.log("[v0] Auto-refreshing rates due to input change")
        fetchShippingRates()
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [
    length,
    breadth,
    height,
    weight,
    unit,
    pickupPincode,
    destinationPincode,
    invoiceAmount,
    paymentType,
    shipmentCategory,
    pickupDetails,
    destinationDetails,
  ])

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
    }
  }, [length, breadth, height, weight, unit])


  return (
    <div className="space-y-8">
      {/* Primary Section: Volumetric Weight Calculator */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Main Calculation Form */}
          <div className="space-y-6">
            <Card>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col xl:flex-row justify-between xl:items-center gap-6">
                    <div className="">
                      <Label className="font-semibold ">Unit Select</Label>
                      <div className="relative inline-flex items-center bg-orange-100 rounded-md mt-2 p-1 border-1 border-orange-300">
                        <button
                          onClick={() => handleUnitChange("cm")}
                          className={`px-4 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${unit === "cm"
                            ? "bg-orange-600 text-white transform scale-105"
                            : "text-orange-700 hover:bg-orange-200"
                            }`}
                        >
                          CM
                        </button>
                        <button
                          onClick={() => handleUnitChange("inches")}
                          className={`px-4 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${unit === "inches"
                            ? "bg-orange-600 text-white transform scale-105"
                            : "text-orange-700 hover:bg-orange-200"
                            }`}
                        >
                          INCH
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1 ">
                        <Label className="font-semibold xl:justify-end">
                          {convertValues
                            ? "Convert values when switching units"
                            : "Keep same values when switching units"}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 xl:justify-end text-muted-foreground/70">
                        <span className="text-sm font-medium ">Keep Values</span>
                        <Switch
                          checked={convertValues}
                          onCheckedChange={setConvertValues}
                          className="data-[state=checked]:bg-orange-500"
                        />
                        <span className="text-sm font-medium">Convert Values</span>
                      </div>
                    </div>
                  </div>
                  {/* <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={unit} onValueChange={handleUnitChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">CM</SelectItem>
                          <SelectItem value="inches">Inches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div> */}

                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">
                        Length
                        {length && (
                          <span className="text-xs text-muted-foreground">
                            ({getConvertedValue(length, unit)})
                          </span>
                        )}
                      </Label>
                      <Input
                        id="length"
                        type="number"
                        inputMode="text"
                        pattern="[0-9+\-*/.]*"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        placeholder="Enter length"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breadth">
                        Breadth
                        {breadth && (
                          <span className="text-xs text-muted-foreground">
                            ({getConvertedValue(breadth, unit)})
                          </span>
                        )}
                      </Label>
                      <Input
                        id="breadth"
                        type="number"
                        inputMode="text"
                        pattern="[0-9+\-*/.]*"
                        value={breadth}
                        onChange={(e) => setBreadth(e.target.value)}
                        placeholder="Enter breadth"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">
                        Height
                        {height && (
                          <span className="text-xs text-muted-foreground">
                            ({getConvertedValue(height, unit)})
                          </span>
                        )}
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        inputMode="text"
                        pattern="[0-9+\-*/.]*"
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
                        inputMode="text"
                        pattern="[0-9+\-*/.]*"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Enter weight"
                      />
                    </div>
                  </div>

                  {/* Volumetric Weight Result */}
                  {volumetricWeight > 0 && (
                    <Card className="bg-muted/50">
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center">
                            <p className="text-xl font-semibold">
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
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareMode(!compareMode)}
                  disabled={savedDimensions.length === 0}
                >
                  <Compare className="w-4 h-4 mr-2" />
                  {compareMode ? "Hide" : "Show"} Comparison
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!length || !breadth || !height || !weight}
                  onClick={saveCurrentDimension}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as {String.fromCharCode(65 + savedDimensions.length)}
                </Button>
              </div>
            </div>

            {/* Comparison Section */}
            {compareMode &&
              <Card className="border-blue-200 bg-blue-50">
                {savedDimensions.length > 0 ?
                  <CardContent>
                    <h3 className="font-semibold mb-3 text-blue-900">Saved Dimensions Comparison</h3>
                    <div className="grid gap-3">
                      {savedDimensions.map((dim) => (
                        <div key={dim.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{dim.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {dim.length}×{dim.breadth}×{dim.height} {dim.unit}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {dim.usedWeight.toFixed(2)}kg
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {dim.bestRate &&
                                `Best Rate: ₹${dim.bestRate.total_shipping_charges} (${dim.bestRate.courier_name})`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => loadDimension(dim)}>
                              Load
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteSavedDimension(dim.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  :
                  <CardContent className="text-sm">
                    No Saved Dimesions and Rates!
                  </CardContent>
                }
              </Card>
            }
          </div>

          {/* Right Column: Shipping Rate Helper */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-chart-4">Live Shipping Rates</h3>
                <p className="text-sm text-muted-foreground">
                  Get real-time shipping costs from various courier partners
                </p>
              </div>
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    API Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>BigShip API Credentials</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-id">User ID</Label>
                      <Input
                        id="user-id"
                        placeholder="Enter your user ID"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="access-key">Access Key ID</Label>
                      <Textarea
                        id="access-key"
                        placeholder="Enter your access_key_id"
                        value={accessKeyId}
                        onChange={(e: any) => setAccessKeyId(e.target.value)}
                        className="min-h-[60px] resize-none w-full whitespace-pre-wrap break-all"
                        wrap="soft"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auth-token">Authorization Token</Label>
                      <Textarea
                        id="auth-token"
                        placeholder="Enter your Bearer token (with 'Bearer ' prefix)"
                        value={authToken}
                        onChange={(e: any) => setAuthToken(e.target.value)}
                        className="min-h-[60px] resize-none w-full whitespace-pre-wrap break-all"
                        wrap="soft"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveCredentials} disabled={!accessKeyId || !authToken || !userId}>
                        Save Credentials
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {(!accessKeyId || !authToken) && (
              <Card className="border-red-200 bg-red-50 px-2 py-4">
                <CardContent className="px-2 flex items-center gap-2 text-red-700">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Configure API credentials to fetch live shipping rates!</span>
                </CardContent>
              </Card>
            )}

            {/* Shipping Configuration */}
            <Card className="border-chart-4/20 border-2">
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-type">Payment Type</Label>
                      <Select value={paymentType} onValueChange={setPaymentType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Prepaid">Prepaid</SelectItem>
                          <SelectItem value="COD">COD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipment-category">Category</Label>
                      <Select value={shipmentCategory} onValueChange={setShipmentCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="B2C">B2C</SelectItem>
                          <SelectItem value="B2B">B2B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pickup-pincode">
                        Pickup Pincode
                        {isValidatingPickup && <Loader2 className="w-4 h-4 inline ml-2 animate-spin" />}
                      </Label>
                      <Input
                        id="pickup-pincode"
                        type="number"
                        inputMode="numeric"
                        value={pickupPincode}
                        onChange={(e) => setPickupPincode(e.target.value)}
                        placeholder="331803"
                        className={`${pickupError && "border-red-300"}`}
                      />
                      {pickupDetails && (
                        <div className="flex items-center gap-1 text-xs text-green-700 ">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {pickupDetails.cityName}, {pickupDetails.state}
                          </span>
                        </div>
                      )}
                      {pickupError && (
                        <div className="text-xs text-red-600">
                          {pickupError}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination-pincode">
                        Destination Pincode
                        {isValidatingDestination && <Loader2 className="w-4 h-4 inline ml-2 animate-spin" />}
                      </Label>
                      <Input
                        id="destination-pincode"
                        type="number"
                        inputMode="numeric"
                        value={destinationPincode}
                        onChange={(e) => setDestinationPincode(e.target.value)}
                        placeholder="400001"
                        className={`${destinationError && "border-red-300"}`}
                      />
                      {destinationDetails && (
                        <div className="flex items-center gap-1 text-xs text-green-700">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {destinationDetails.cityName}, {destinationDetails.state}
                          </span>
                        </div>
                      )}
                      {destinationError && (
                        <div className="text-xs text-red-600">
                          {destinationError}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoice-amount">Invoice Amount (₹)</Label>
                      <Input
                        id="invoice-amount"
                        type="number"
                        inputMode="text"
                        pattern="[0-9+\-*/.]*"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        placeholder="800"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Rates Display */}
            {(courierRates.length > 0 || isLoadingRates || ratesError) && (
              <Card className="border-chart-4">
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-chart-4">Available Shipping Options</h4>
                    <Button
                      onClick={fetchShippingRates}
                      disabled={
                        isLoadingRates || !length || !breadth || !height || !weight || !accessKeyId || !authToken
                      }
                      size="sm"
                      className="bg-chart-4 hover:bg-chart-4"
                    >
                      {isLoadingRates ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Rates
                        </>
                      )}
                    </Button>
                  </div>

                  {ratesError && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-md mb-4">
                      <strong>Error:</strong> {ratesError}
                    </div>
                  )}

                  {isLoadingRates && (
                    <div className="flex items-center justify-center py-8 bg-chart-4/10 rounded-lg">
                      <Loader2 className="w-6 h-6 animate-spin mr-2 text-chart-4" />
                      <span className="text-chart-4">Fetching live shipping rates...</span>
                    </div>
                  )}

                  {courierRates.length > 0 && !isLoadingRates && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                        <span>Courier & Type</span>
                        <span>Zone & TAT</span>
                        <span>Weight Used</span>
                        <span className="text-right">Total Cost</span>
                      </div>
                      {courierRates.slice(0, 10).map((rate, index) => (
                        <div
                          key={index}
                          className={`grid grid-cols-4 gap-2 p-3 rounded-lg border items-center transition-colors hover:bg-chart-4/10 bg-white border-gray-200 
                              ${index === 0 && "border-chart-4/50"}
                            `}
                        >
                          <div>
                            <div className="font-medium text-sm">{rate.courier_name}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {rate.courier_type}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm">Zone {rate.zone}</div>
                            <div className="text-xs text-muted-foreground">{rate.tat} days</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{rate.weight.applied_weight}kg</div>
                            <div className="text-xs text-muted-foreground">
                              {rate.weight.volumetric_weight > rate.weight.dead_weight ? "Vol" : "Dead"} Weight
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${index === 0 ? "text-chart-4" : "text-chart-4"}`}>
                              ₹{rate.total_shipping_charges}
                            </div>
                            {rate.cod_charge > 0 && (
                              <div className="text-xs text-muted-foreground">+ ₹{rate.cod_charge} COD</div>
                            )}
                            {index === 0 && (
                              <Badge variant="default" className="text-xs mt-1 bg-chart-4 hover:bg-chart-4">
                                👑 Lowest Price
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {courierRates.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center pt-2 bg-chart-4 p-2 rounded">
                          Showing top 10 results out of {courierRates.length} available options • Sorted by price
                          (lowest first)
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
