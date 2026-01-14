import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { trackShipment, detectCourierPartner, normalizeCourierName, type CourierPartner } from "@/lib/courier-tracking"

/**
 * Track a single order by ID or AWB
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { orderId, awb, courier } = body

    if (!orderId && !awb) {
      return NextResponse.json({ error: "Order ID or AWB is required" }, { status: 400 })
    }

    // Fetch order from database
    let order
    if (orderId) {
      const { data, error } = await supabase
        .from("meesho_orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }
      order = data
    }

    // Use AWB from request or order
    const trackingAwb = awb || order?.awb_number

    if (!trackingAwb) {
      return NextResponse.json({ error: "AWB number not found for this order" }, { status: 400 })
    }

    // Determine courier partner - prioritize order data from PDF parsing
    let courierPartner: CourierPartner | null = null

    console.log(`[Track API] Order courier_partner from DB:`, order?.courier_partner)

    // Priority 1: Use courier from request
    if (courier) {
      courierPartner = normalizeCourierName(courier) || courier.toLowerCase() as CourierPartner
      console.log(`[Track API] Using courier from request: ${courierPartner}`)
    }

    // Priority 2: Use courier from order (extracted from PDF label)
    if (!courierPartner && order?.courier_partner) {
      courierPartner = normalizeCourierName(order.courier_partner)
      console.log(`[Track API] Using courier from order DB: ${courierPartner}`)
    }

    // Priority 3: Fallback to AWB pattern detection
    if (!courierPartner) {
      courierPartner = detectCourierPartner(trackingAwb)
      console.log(`[Track API] Detected courier from AWB pattern: ${courierPartner}`)
    }

    if (!courierPartner) {
      console.error(`[Track API] Could not determine courier for AWB: ${trackingAwb}`)
      return NextResponse.json(
        { error: "Could not determine courier partner. Please set courier partner for this order." },
        { status: 400 }
      )
    }

    console.log(`[Track API] Final courier partner: ${courierPartner}, AWB: ${trackingAwb}`)

    // Track shipment
    let trackingStatus
    try {
      trackingStatus = await trackShipment(trackingAwb, courierPartner)
      console.log(`[Track API] Tracking result:`, {
        status: trackingStatus.status,
        message: trackingStatus.statusMessage,
        courier: trackingStatus.courier
      })
    } catch (error: any) {
      // Handle XPressBees reCAPTCHA error gracefully
      if (courierPartner === 'xpressbees' && error.message.includes('reCAPTCHA')) {
        console.log(`[Track API] XPressBees tracking skipped (reCAPTCHA required)`)
        return NextResponse.json({
          success: false,
          error: "XPressBees tracking requires manual verification. Click the AWB link to track.",
          courier: courierPartner,
          awb: trackingAwb
        }, { status: 200 }) // Return 200 so bulk tracking doesn't fail
      }
      throw error // Re-throw other errors
    }

    // Update order in database if we have an order ID
    if (order) {
      const trackingHistory = order.tracking_history || []
      trackingHistory.push({
        timestamp: new Date().toISOString(),
        status: trackingStatus.status,
        message: trackingStatus.statusMessage,
        location: trackingStatus.currentLocation,
        rawStatus: trackingStatus.statusMessage,
      })

      const updateData: any = {
        status: trackingStatus.status,
        last_status_update: trackingStatus.lastUpdate,
        tracking_history: trackingHistory,
      }

      // Update delivery date if delivered
      if (trackingStatus.status === "delivered" && !order.delivered_date) {
        updateData.delivered_date = trackingStatus.lastUpdate
      }

      // Update expected delivery if available
      if (trackingStatus.estimatedDelivery) {
        updateData.expected_delivery_date = trackingStatus.estimatedDelivery
      }

      // Update courier partner if it was auto-detected
      if (!order.courier_partner && courierPartner) {
        updateData.courier_partner = courierPartner
      }

      console.log(`[Track API] Updating order ${order.order_id} (id: ${order.id}, user_id: ${user.id}) with data:`, updateData)

      const { data: updatedData, error: updateError } = await supabase
        .from("meesho_orders")
        .update(updateData)
        .eq("id", order.id)
        .eq("user_id", user.id)
        .select()

      if (updateError) {
        console.error(`[Track API] ❌ FAILED to update order ${order.order_id}:`, updateError)
        console.error(`[Track API] Update error details:`, JSON.stringify(updateError, null, 2))
      } else if (!updatedData || updatedData.length === 0) {
        console.error(`[Track API] ⚠️  No rows updated for order ${order.order_id}! Check user_id match.`)
      } else {
        console.log(`[Track API] ✅ Successfully updated order ${order.order_id}. New status: ${updatedData[0].status}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: trackingStatus,
      message: `Order status updated to: ${trackingStatus.status}`,
    })
  } catch (error: any) {
    console.error("Tracking error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to track shipment",
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

/**
 * Bulk track all pending/in-transit orders
 */
export async function GET(req: Request) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    // Fetch all orders that are not yet delivered/cancelled
    const { data: orders, error } = await supabase
      .from("meesho_orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "shipped", "in_transit", "out_for_delivery"])
      .not("awb_number", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: "No orders to track", updatedCount: 0 })
    }

    const results = {
      total: orders.length,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Track each order
    for (const order of orders) {
      try {
        // Determine courier partner - prioritize data from PDF parsing
        let courierPartner: CourierPartner | null = null

        // Priority 1: Use courier from order (extracted from PDF label)
        if (order.courier_partner) {
          courierPartner = normalizeCourierName(order.courier_partner)
        }

        // Priority 2: Fallback to AWB pattern detection
        if (!courierPartner) {
          courierPartner = detectCourierPartner(order.awb_number)
        }

        if (!courierPartner) {
          results.failed++
          results.errors.push(`Order ${order.order_id}: Could not determine courier partner`)
          continue
        }

        const trackingStatus = await trackShipment(order.awb_number, courierPartner)

        // Update order
        const trackingHistory = order.tracking_history || []
        trackingHistory.push({
          timestamp: new Date().toISOString(),
          status: trackingStatus.status,
          message: trackingStatus.statusMessage,
          location: trackingStatus.currentLocation,
          rawStatus: trackingStatus.statusMessage,
        })

        const updateData: any = {
          status: trackingStatus.status,
          last_status_update: trackingStatus.lastUpdate,
          tracking_history: trackingHistory,
        }

        if (trackingStatus.status === "delivered" && !order.delivered_date) {
          updateData.delivered_date = trackingStatus.lastUpdate
        }

        if (trackingStatus.estimatedDelivery) {
          updateData.expected_delivery_date = trackingStatus.estimatedDelivery
        }

        if (!order.courier_partner && courierPartner) {
          updateData.courier_partner = courierPartner
        }

        await supabase.from("meesho_orders").update(updateData).eq("id", order.id).eq("user_id", user.id)

        results.updated++

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error: any) {
        results.failed++
        results.errors.push(`Order ${order.order_id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tracking completed: ${results.updated} updated, ${results.failed} failed`,
      ...results,
    })
  } catch (error: any) {
    console.error("Bulk tracking error:", error)
    return NextResponse.json({ error: error.message || "Failed to track orders" }, { status: 500 })
  }
}
