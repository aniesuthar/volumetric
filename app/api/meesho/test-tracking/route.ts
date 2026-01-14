import { NextResponse } from "next/server"
import { trackShipment, detectCourierPartner, normalizeCourierName } from "@/lib/courier-tracking"

/**
 * Test tracking endpoint - returns detailed logs
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { awb, courier } = body

    if (!awb) {
      return NextResponse.json({ error: "AWB is required" }, { status: 400 })
    }

    const logs: string[] = []

    // Test courier detection
    const detectedCourier = detectCourierPartner(awb)
    logs.push(`Detected courier from AWB pattern: ${detectedCourier}`)

    // Test courier normalization
    if (courier) {
      const normalizedCourier = normalizeCourierName(courier)
      logs.push(`Normalized courier "${courier}" to: ${normalizedCourier}`)
    }

    // Use provided courier or detected
    const finalCourier = courier ? normalizeCourierName(courier) : detectedCourier

    if (!finalCourier) {
      return NextResponse.json({
        error: "Could not determine courier partner",
        logs
      }, { status: 400 })
    }

    logs.push(`Final courier: ${finalCourier}`)

    // Track the shipment
    const result = await trackShipment(awb, finalCourier)

    return NextResponse.json({
      success: true,
      logs,
      result: {
        courier: result.courier,
        status: result.status,
        statusMessage: result.statusMessage,
        lastUpdate: result.lastUpdate,
        estimatedDelivery: result.estimatedDelivery,
        currentLocation: result.currentLocation,
        rawResponse: result.rawResponse
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}
