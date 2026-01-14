/**
 * Courier Tracking Service
 * Fetches real-time tracking status from XPressBees, Shadowfax, and Delhivery
 */

export type CourierPartner = "xpressbees" | "shadowfax" | "delhivery"

export interface TrackingStatus {
  awb: string
  courier: CourierPartner
  status: "pending" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "rto" | "cancelled"
  statusMessage: string
  lastUpdate: string
  estimatedDelivery?: string
  currentLocation?: string
  trackingHistory: TrackingEvent[]
  rawResponse?: any
}

export interface TrackingEvent {
  timestamp: string
  status: string
  location?: string
  message: string
}

/**
 * XPressBees Tracking
 * API: https://www.xpressbees.com/api/tracking
 */
async function trackXPressBees(awb: string): Promise<TrackingStatus> {
  // XPressBees now requires reCAPTCHA v3 token which cannot be generated server-side
  // Inform user to track manually via their website
  console.warn(`[XPressBees] Tracking blocked - reCAPTCHA required. AWB: ${awb}`)
  console.warn(`[XPressBees] Please track manually at: https://www.xpressbees.com/shipment/tracking?awbNo=${awb}`)

  throw new Error(`XPressBees requires reCAPTCHA verification. Please track manually by clicking the AWB link.`)
}

/**
 * Shadowfax Tracking
 * API: https://saruman.shadowfax.in/web_app/delivery/track/{AWB}
 */
async function trackShadowfax(awb: string): Promise<TrackingStatus> {
  try {
    const url = `https://saruman.shadowfax.in/web_app/delivery/track/${awb}/`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Authorization": "Token cePcVR7z7FIETB4PxguHC2YJGk6NncHnByrJttgRIUqNxfWezuzAUvtALyqcHJEC",
        "Origin": "https://tracker.shadowfax.in",
        "Referer": "https://tracker.shadowfax.in/",
      },
    })

    if (!response.ok) {
      throw new Error(`Shadowfax API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.message !== 'Success') {
      throw new Error('No tracking data found')
    }

    // Parse Shadowfax response
    const trackingHistory: TrackingEvent[] = []
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((event: any) => {
        const subStatuses = event.sub_status || []
        const times = event.time || []
        subStatuses.forEach((subStatus: string, index: number) => {
          trackingHistory.push({
            timestamp: times[index] || new Date().toISOString(),
            status: event.main_status,
            location: '',
            message: subStatus,
          })
        })
      })
    }

    const orderDetails = data.order_details || {}

    // Map Shadowfax status to our system status
    const status = mapShadowfaxStatus(orderDetails.status_id || orderDetails.final_status)

    return {
      awb,
      courier: "shadowfax",
      status,
      statusMessage: orderDetails.final_status || "Unknown",
      lastUpdate: new Date().toISOString(),
      estimatedDelivery: orderDetails.exp_delivery_date,
      currentLocation: '',
      trackingHistory,
      rawResponse: data,
    }
  } catch (error: any) {
    console.error("Shadowfax tracking error:", error)
    throw new Error(`Failed to track Shadowfax: ${error.message}`)
  }
}

/**
 * Delhivery Tracking
 * API: https://dlv-api.delhivery.com/v3/unified-tracking?wbn={AWB}
 */
async function trackDelhivery(awb: string): Promise<TrackingStatus> {
  try {
    const url = `https://dlv-api.delhivery.com/v3/unified-tracking?wbn=${awb}`

    console.log(`[Delhivery] Tracking AWB: ${awb}`)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.delhivery.com",
        "Referer": "https://www.delhivery.com/",
      },
    })

    console.log(`[Delhivery] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Delhivery] Error response: ${errorText}`)
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[Delhivery] Full response:`, JSON.stringify(data, null, 2))

    // Check if response has data
    if (!data.data || data.data.length === 0) {
      console.error(`[Delhivery] No tracking data in response. StatusCode: ${data.statusCode}`)
      console.error(`[Delhivery] Full response:`, data)
      throw new Error(`No tracking data found for AWB ${awb}. Response: ${JSON.stringify(data)}`)
    }

    const shipment = data.data[0]
    console.log(`[Delhivery] Shipment object:`, JSON.stringify(shipment, null, 2))

    // Parse Delhivery response
    const trackingHistory: TrackingEvent[] = []
    if (shipment.trackingStates && Array.isArray(shipment.trackingStates)) {
      shipment.trackingStates.forEach((state: any) => {
        if (state.scans && Array.isArray(state.scans)) {
          state.scans.forEach((scan: any) => {
            trackingHistory.push({
              timestamp: scan.scanDateTime || state.scanDateTime || new Date().toISOString(),
              status: scan.scan || state.label,
              location: scan.cityLocation || scan.scannedLocation || '',
              message: scan.scanNslRemark || scan.scan || state.label,
            })
          })
        }
      })
    }

    // Map Delhivery status to our system status
    // Priority: hqStatus (more reliable) > status.status > currentStatus
    const hqStatus = shipment.hqStatus
    const detailedStatus = shipment.status?.status
    const currentStatus = shipment.currentStatus
    const instructions = shipment.status?.instructions || ""
    const deliveryPillLabel = shipment.deliveryPillLabel || ""
    const scanRemark = shipment.trackingStates?.[0]?.scans?.[0]?.scanNslRemark || ""

    console.log(`[Delhivery] Raw status fields:`, {
      'hqStatus': hqStatus,
      'status.status': detailedStatus,
      'currentStatus': currentStatus,
      'instructions': instructions,
      'deliveryPillLabel': deliveryPillLabel,
      'scanRemark': scanRemark,
      'full status object': shipment.status
    })

    // Check if order is cancelled based on multiple indicators
    let mappedStatus: TrackingStatus["status"]
    const cancelIndicators = [
      instructions.toLowerCase(),
      deliveryPillLabel.toLowerCase(),
      scanRemark.toLowerCase()
    ].join(' ')

    if (cancelIndicators.includes("cancel")) {
      console.log(`[Delhivery] Order cancelled - indicators: instructions="${instructions}", pill="${deliveryPillLabel}", remark="${scanRemark}"`)
      mappedStatus = "cancelled"
    } else {
      // Try mapping hqStatus first (most reliable), then fall back to detailed status
      if (hqStatus && hqStatus !== "Manifested") {
        console.log(`[Delhivery] Using hqStatus: ${hqStatus}`)
        mappedStatus = mapDelhiveryStatus(hqStatus)
      } else if (detailedStatus) {
        console.log(`[Delhivery] Using status.status: ${detailedStatus}`)
        mappedStatus = mapDelhiveryStatus(detailedStatus)
      } else {
        console.log(`[Delhivery] Using currentStatus: ${currentStatus}`)
        mappedStatus = mapDelhiveryStatus(currentStatus)
      }
    }

    const statusValue = hqStatus || detailedStatus || currentStatus
    console.log(`[Delhivery] Final status value: ${statusValue}, Mapped status: ${mappedStatus}`)

    return {
      awb,
      courier: "delhivery",
      status: mappedStatus,
      statusMessage: shipment.hqStatus || statusValue || "Unknown",
      lastUpdate: shipment.status?.statusDateTime || new Date().toISOString(),
      estimatedDelivery: shipment.deliveryDate || shipment.promiseDeliveryDate,
      currentLocation: shipment.destination,
      trackingHistory,
      rawResponse: data,
    }
  } catch (error: any) {
    console.error("[Delhivery] Tracking error:", error)
    throw new Error(`Failed to track Delhivery: ${error.message}`)
  }
}

/**
 * Status mapping functions
 */
function mapXPressBeesStatus(courierStatus: string): TrackingStatus["status"] {
  const status = courierStatus?.toLowerCase() || ""

  if (status.includes("delivered")) return "delivered"
  if (status.includes("out for delivery")) return "out_for_delivery"
  if (status.includes("in transit") || status.includes("intransit")) return "in_transit"
  if (status.includes("shipped") || status.includes("picked")) return "shipped"
  if (status.includes("rto") || status.includes("return")) return "rto"
  if (status.includes("cancel")) return "cancelled"

  return "pending"
}

function mapShadowfaxStatus(courierStatus: string): TrackingStatus["status"] {
  const status = courierStatus?.toLowerCase() || ""

  if (status.includes("delivered") || status === "dld") return "delivered"
  if (status.includes("out for delivery") || status.includes("out_for_delivery") || status === "ofd") return "out_for_delivery"
  if (status.includes("in transit") || status.includes("in_transit") || status === "it") return "in_transit"
  if (status.includes("shipped") || status.includes("picked") || status.includes("dispatched") || status === "pic") return "shipped"
  if (status.includes("rto") || status.includes("return")) return "rto"
  if (status.includes("cancel")) return "cancelled"

  return "pending"
}

function mapDelhiveryStatus(courierStatus: string | undefined | null): TrackingStatus["status"] {
  if (!courierStatus) {
    console.warn('[Delhivery] Status value is null/undefined, defaulting to pending')
    return "pending"
  }

  const status = courierStatus.toLowerCase().trim()
  console.log(`[Delhivery] Mapping status: "${courierStatus}" -> "${status}"`)

  // Delivered statuses
  if (status.includes("delivered") || status === "dld") return "delivered"

  // Out for delivery statuses
  if (status.includes("out for delivery") || status.includes("out_for_delivery") || status === "ofd") return "out_for_delivery"

  // In transit statuses
  if (status.includes("in transit") || status.includes("intransit") || status.includes("in_transit")) return "in_transit"
  if (status.includes("reached at") || status.includes("arrived at")) return "in_transit"
  if (status.includes("in scan") || status.includes("inscan")) return "in_transit"

  // Shipped/Dispatched statuses (picked up and moving)
  if (status.includes("shipped") || status.includes("dispatched")) return "shipped"
  if (status.includes("pickup done") || status.includes("picked up")) return "shipped"
  if (status === "picked" || status === "pic") return "shipped"
  if (status.includes("forwarded") || status.includes("forwarding")) return "shipped"

  // Pending/Waiting pickup statuses
  if (status.includes("waiting_pickup") || status.includes("waiting pickup")) return "pending"
  if (status === "manifested" || status.includes("manifest")) return "pending"
  if (status.includes("not picked") || status.includes("not_picked")) return "pending"
  if (status.includes("pending") || status.includes("pickup pending")) return "pending"
  if (status.includes("booked") || status.includes("registered")) return "pending"

  // RTO/Return statuses
  if (status.includes("rto") || status.includes("return to origin")) return "rto"
  if (status.includes("return")) return "rto"
  if (status.includes("undelivered") || status.includes("un-delivered")) return "rto"

  // Cancelled statuses
  if (status.includes("cancel")) return "cancelled"

  console.warn(`[Delhivery] Unknown status: "${status}", defaulting to pending`)
  return "pending"
}

/**
 * Detect courier partner from AWB number (fallback method)
 * IMPORTANT: Prefer using the courier name from the PDF label parsing
 * This function is only used when courier name is not already stored
 */
export function detectCourierPartner(awb: string): CourierPartner | null {
  if (!awb) return null

  // XPressBees: Usually starts with specific patterns
  if (/^[A-Z]{2}[0-9]{10,}/i.test(awb) && awb.includes("XB")) {
    return "xpressbees"
  }

  // Shadowfax: Usually starts with SF
  if (/^SF[0-9]{10,}/i.test(awb)) {
    return "shadowfax"
  }

  // Delhivery: Various patterns, usually alphanumeric
  if (/^[A-Z0-9]{10,}/i.test(awb) && !awb.startsWith("SF")) {
    return "delhivery"
  }

  return null
}

/**
 * Normalize courier partner name from database/PDF to standard format
 */
export function normalizeCourierName(courierName: string): CourierPartner | null {
  if (!courierName) return null

  const normalized = courierName.toLowerCase().trim()

  if (normalized.includes("shadowfax")) return "shadowfax"
  if (normalized.includes("delhivery")) return "delhivery"
  if (normalized.includes("xpress") || normalized === "xpressbees") return "xpressbees"

  return null
}

/**
 * Main tracking function - auto-detects courier and fetches status
 */
export async function trackShipment(awb: string, courier?: CourierPartner): Promise<TrackingStatus> {
  if (!awb) {
    throw new Error("AWB number is required")
  }

  // Auto-detect courier if not provided
  const detectedCourier = courier || detectCourierPartner(awb)

  if (!detectedCourier) {
    throw new Error("Could not detect courier partner. Please specify courier manually.")
  }

  switch (detectedCourier) {
    case "xpressbees":
      return trackXPressBees(awb)
    case "shadowfax":
      return trackShadowfax(awb)
    case "delhivery":
      return trackDelhivery(awb)
    default:
      throw new Error(`Unsupported courier: ${detectedCourier}`)
  }
}

/**
 * Bulk tracking - track multiple shipments
 */
export async function trackMultipleShipments(
  shipments: Array<{ awb: string; courier?: CourierPartner }>
): Promise<TrackingStatus[]> {
  const results = await Promise.allSettled(
    shipments.map((shipment) => trackShipment(shipment.awb, shipment.courier))
  )

  return results
    .filter((result): result is PromiseFulfilledResult<TrackingStatus> => result.status === "fulfilled")
    .map((result) => result.value)
}

/**
 * Get tracking URL for manual tracking
 * Returns the public tracking URL that users can open in browser
 */
export function getTrackingUrl(awb: string, courier: CourierPartner | string): string {
  const normalizedCourier = typeof courier === 'string' ? normalizeCourierName(courier) : courier

  switch (normalizedCourier) {
    case 'shadowfax':
      // Shadowfax frontend tracker
      return `https://tracker.shadowfax.in/#/track/${awb}/Fwd`
    case 'delhivery':
      // Delhivery public tracking
      return `https://www.delhivery.com/track/package/${awb}`
    case 'xpressbees':
      // XPressBees public tracking with query parameter
      return `https://www.xpressbees.com/shipment/tracking?awbNo=${awb}`
    default:
      return `https://www.google.com/search?q=track+${awb}`
  }
}
