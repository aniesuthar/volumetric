import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { trackShipment, normalizeCourierName, type CourierPartner } from "@/lib/courier-tracking"

/**
 * Confirm and save previewed orders to database
 * Then fetch tracking status for each order
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
    const { orders, labelFileUrl, labelFileName } = body

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "Orders array is required" }, { status: 400 })
    }

    // Prepare orders for insertion
    const ordersToInsert = orders.map((order: any) => ({
      ...order,
      user_id: user.id,
      label_file_url: labelFileUrl || order.label_file_url,
      label_file_name: labelFileName || order.label_file_name,
      status: order.status || "pending",
    }))

    // Insert all orders into database
    const { data: insertedOrders, error: insertError } = await supabase
      .from("meesho_orders")
      .insert(ordersToInsert)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    // Note: Auto-tracking is disabled due to API CORS/auth restrictions
    // Users can manually track orders by clicking tracking links in the UI
    const trackingResults = {
      total: insertedOrders?.length || 0,
      tracked: 0,
      failed: 0,
      errors: [] as string[],
      message: "Orders saved successfully. Use the 'Track' button to check status manually."
    }

    return NextResponse.json({
      success: true,
      message: `Created ${trackingResults.total} orders, tracked ${trackingResults.tracked} successfully`,
      data: {
        ordersCreated: insertedOrders?.length || 0,
        orders: insertedOrders,
        tracking: trackingResults,
      },
    })
  } catch (error: any) {
    console.error("Confirm orders error:", error)
    return NextResponse.json({ error: error.message || "Failed to confirm orders" }, { status: 500 })
  }
}
