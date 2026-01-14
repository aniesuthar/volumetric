import { NextResponse } from "next/server"

/**
 * Get Shadowfax frontend tracking URL
 * Shadowfax uses a unique tracking code instead of AWB
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const awb = searchParams.get("awb")

    if (!awb) {
      return NextResponse.json({ error: "AWB is required" }, { status: 400 })
    }

    // Fetch tracking data from Shadowfax API
    const url = `https://saruman.shadowfax.in/web_app/delivery/track/${awb}/`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      // If API fails, return AWB-based URL as fallback
      return NextResponse.json({
        success: true,
        trackingUrl: `https://tracker.shadowfax.in/#/track/${awb}/Fwd`,
        fallback: true,
      })
    }

    const data = await response.json()

    // Try to extract tracking code from response
    // Check different possible field names
    const trackingCode =
      data.tracking_code ||
      data.trackingCode ||
      data.order_details?.tracking_code ||
      data.data?.tracking_code

    if (trackingCode) {
      return NextResponse.json({
        success: true,
        trackingUrl: `https://tracker.shadowfax.in/#/track/${trackingCode}/Fwd`,
        trackingCode,
      })
    }

    // Fallback to AWB-based URL
    return NextResponse.json({
      success: true,
      trackingUrl: `https://tracker.shadowfax.in/#/track/${awb}/Fwd`,
      fallback: true,
    })
  } catch (error: any) {
    console.error("Shadowfax tracking URL error:", error)

    // Return fallback URL on error
    const { searchParams } = new URL(req.url)
    const awb = searchParams.get("awb") || ""

    return NextResponse.json({
      success: true,
      trackingUrl: `https://tracker.shadowfax.in/#/track/${awb}/Fwd`,
      fallback: true,
      error: error.message,
    })
  }
}
