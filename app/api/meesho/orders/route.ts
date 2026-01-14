import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  let query = supabase
    .from("meesho_orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("meesho_orders")
    .insert([{ ...body, user_id: user.id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function PUT(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 422 })

  const { data, error } = await supabase
    .from("meesho_orders")
    .update({
      order_id: body.order_id,
      product_name: body.product_name,
      sku: body.sku,
      quantity: body.quantity,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      customer_address: body.customer_address,
      customer_city: body.customer_city,
      customer_state: body.customer_state,
      customer_pincode: body.customer_pincode,
      awb_number: body.awb_number,
      courier_partner: body.courier_partner,
      status: body.status,
      last_status_update: body.last_status_update,
      expected_delivery_date: body.expected_delivery_date,
      delivered_date: body.delivered_date,
      notes: body.notes,
      tracking_history: body.tracking_history,
    })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!id) return NextResponse.json({ error: "id required" }, { status: 422 })

  const { error } = await supabase.from("meesho_orders").delete().eq("id", id).eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
