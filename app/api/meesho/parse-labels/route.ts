import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// Helper function to extract order details from text
function extractOrderFromText(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean)
  const order: any = {}

  // Extract AWB number - multiple patterns:
  // Shadowfax: SF2298198977FPL (starts with SF)
  // Delhivery: 1490819559850913 (pure numbers, 13-16 digits)
  // XPressBees: 134095797958842 (pure numbers, 13-16 digits)

  // Try Shadowfax pattern first (SF + numbers + letters)
  let awbMatch = text.match(/\b(SF[0-9]{10,}[A-Z]{3})\b/i)
  if (awbMatch) {
    order.awb = awbMatch[1]
  } else {
    // Try pure number pattern (13-16 digits) - look for numbers above barcode area
    // Match numbers that appear near "Pickup", "Return Code", or on their own line
    const numberMatches = text.match(/\b([0-9]{13,16})\b/g)
    if (numberMatches && numberMatches.length > 0) {
      // Usually the first long number after "Pickup" or before "Product Details" is the AWB
      order.awb = numberMatches[0]
    }
  }

  // Extract Order Number (e.g., 210219568029895040_1)
  const orderMatch = text.match(/Order\s*No\.?\s*\n?\s*([0-9_]+)/i)
  if (orderMatch) {
    order.orderId = orderMatch[1]
  } else {
    // Try finding long number pattern
    const longNumberMatch = text.match(/\b([0-9]{15,}_[0-9])\b/)
    if (longNumberMatch) order.orderId = longNumberMatch[1]
  }

  // Extract Customer Name (first line after "Customer Address")
  const nameMatch = text.match(/Customer\s*Address\s*\n\s*([A-Za-z\s.]+)/i)
  if (nameMatch) order.customerName = nameMatch[1].trim()

  // Extract complete address block
  const addressMatch = text.match(/Customer\s*Address\s*\n([\s\S]+?)(?=If undelivered|COD:|Pickup|$)/i)
  if (addressMatch) {
    const addressBlock = addressMatch[1].trim()
    const addressLines = addressBlock.split("\n").map(l => l.trim()).filter(Boolean)

    // First line is name
    if (addressLines.length > 0) {
      order.customerName = addressLines[0]
    }

    // Look for the line with City, State, Pincode (last line usually)
    // Pattern: "City, State, Pincode" or "City, State Pincode"
    let cityStateFound = false
    for (let i = addressLines.length - 1; i >= 0; i--) {
      const line = addressLines[i]
      // Match pattern: "Something, State, 6-digit-pincode"
      const cityStatePinMatch = line.match(/^([^,]+),\s*([A-Za-z\s]+),?\s*(\d{6})$/i)
      if (cityStatePinMatch) {
        order.city = cityStatePinMatch[1].trim()
        order.state = cityStatePinMatch[2].trim()
        order.pincode = cityStatePinMatch[3]
        cityStateFound = true
        // Address is everything except name and city-state-pin line
        const addressParts = addressLines.slice(1, i)
        order.customerAddress = addressParts.join(", ")
        break
      }
    }

    // Fallback: if city-state-pin not found, use all lines except first as address
    if (!cityStateFound && addressLines.length > 1) {
      order.customerAddress = addressLines.slice(1).join(", ")
    }
  }

  // Fallback pincode extraction if not already found
  if (!order.pincode) {
    const pincodeMatches = text.match(/\b([0-9]{6})\b/g)
    if (pincodeMatches && pincodeMatches.length > 0) {
      // First pincode in customer address area is usually customer pincode
      order.pincode = pincodeMatches[0]
    }
  }

  // Fallback state extraction if not already found
  if (!order.state) {
    const stateMatch = text.match(/,\s*([A-Za-z\s]+),?\s*\d{6}/i)
    if (stateMatch) order.state = stateMatch[1].trim()
  }

  // Extract Courier Partner (e.g., Shadowfax, Delhivery, Xpressbees)
  // Priority 1: Look for courier name directly in the text (most common in Meesho labels)
  const courierPatterns = [
    /\b(Shadowfax)\b/i,
    /\b(Delhivery)\b/i,
    /\b(Xpressbees|XPressBees|X-Press\s*Bees)\b/i,
    /\b(Ekart|eKart)\b/i,
    /\b(Blue\s*Dart|BlueDart)\b/i,
    /\b(DTDC)\b/i,
  ]

  for (const pattern of courierPatterns) {
    const match = text.match(pattern)
    if (match) {
      // Normalize courier name
      let courierName = match[1].toLowerCase()
      if (courierName.includes("xpress") || courierName.includes("x-press")) {
        order.courier = "Xpressbees"
      } else if (courierName.includes("shadowfax")) {
        order.courier = "Shadowfax"
      } else if (courierName.includes("delhivery")) {
        order.courier = "Delhivery"
      } else if (courierName.includes("ekart")) {
        order.courier = "Ekart"
      } else if (courierName.includes("blue") || courierName.includes("dart")) {
        order.courier = "BlueDart"
      } else if (courierName.includes("dtdc")) {
        order.courier = "DTDC"
      } else {
        order.courier = match[1]
      }
      break
    }
  }

  // Priority 2: Look after COD line (as in your PDF example)
  if (!order.courier) {
    const codCourierMatch = text.match(/COD:.*?\n\s*([A-Za-z\s]+)\s*\n/i)
    if (codCourierMatch) {
      const courierText = codCourierMatch[1].trim()
      // Check if it matches known couriers
      if (/shadowfax/i.test(courierText)) order.courier = "Shadowfax"
      else if (/delhivery/i.test(courierText)) order.courier = "Delhivery"
      else if (/xpress/i.test(courierText)) order.courier = "Xpressbees"
      else order.courier = courierText
    }
  }

  // Extract SKU from Product Details table
  const skuMatch = text.match(/SKU.*?\n\s*([A-Za-z0-9_-]+)/i)
  if (skuMatch) order.sku = skuMatch[1]

  // Extract Product Name (same as SKU in this case, or before it)
  if (order.sku) {
    order.productName = order.sku
  }

  // Extract Quantity from Product Details table
  // Table format: SKU Size Qty Color Order No.
  // Example: Z5QNMQH2Free Size2Black208864860526741440_1

  // Try to find the table row with SKU, Size, Qty, Color pattern
  const tableRowMatch = text.match(/([A-Z0-9_-]+)\s*Free Size\s*(\d+)\s*([A-Za-z]+)\s*(\d{18,}_\d+)/i)
  if (tableRowMatch) {
    order.quantity = parseInt(tableRowMatch[2])
  } else {
    // Fallback: Look for "Qty" followed by a number
    const qtyMatch = text.match(/Qty[:\s]*(\d+)/i)
    if (qtyMatch) {
      order.quantity = parseInt(qtyMatch[1])
    } else {
      // Another fallback: "Free Size" followed by number
      const qtyTableMatch = text.match(/Free Size\s+(\d+)/i)
      if (qtyTableMatch) order.quantity = parseInt(qtyTableMatch[1])
    }
  }

  // Extract Color from the table row (already captured above)
  if (tableRowMatch && tableRowMatch[3]) {
    order.color = tableRowMatch[3]
    // Append to product name if exists
    if (order.productName) {
      order.productName = `${order.productName} (${order.color})`
    }
  } else {
    // Fallback: Look for "Color" header pattern
    const colorMatch = text.match(/Color[:\s]*\n?\s*([A-Za-z]+)/i)
    if (colorMatch) {
      order.color = colorMatch[1]
      if (order.productName) {
        order.productName = `${order.productName} (${order.color})`
      }
    }
  }

  // Extract Size
  const sizeMatch = text.match(/Size.*?\n.*?\s([A-Za-z0-9\s]+)/i)
  if (sizeMatch) {
    order.size = sizeMatch[1].trim()
  }

  // Extract phone if present
  const phoneMatch = text.match(/\b([6-9][0-9]{9})\b/)
  if (phoneMatch) order.customerPhone = phoneMatch[1]

  return order
}

// Split PDF text into individual order sections
function splitIntoOrders(fullText: string): string[] {
  const orders: string[] = []

  // Meesho labels typically have "Customer Address" as the start of each label
  // Try to split by this pattern
  let sections = fullText.split(/(?=Customer\s*Address)/i)

  // If that doesn't work, try splitting by AWB pattern (SF followed by numbers)
  if (sections.length < 2) {
    sections = fullText.split(/(?=[A-Z]{2}[0-9]{10,}[A-Z]{3})/i)
  }

  // Option 3: Split by Product Details section
  if (sections.length < 2) {
    sections = fullText.split(/(?=Product\s*Details)/i)
  }

  // Option 4: Split by Return Code pattern
  if (sections.length < 2) {
    sections = fullText.split(/(?=Return\s*Code)/i)
  }

  // Filter out very short sections (likely noise)
  const validSections = sections.filter((section) => section.length > 100)

  return validSections.length > 0 ? validSections : [fullText]
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const previewOnly = formData.get("preview") === "true" // New parameter

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Use pdf-parse (load inside the function to avoid build-time issues)
    const pdfParse = require("pdf-parse")
    const pdfData = await pdfParse(buffer)
    const fullText = pdfData.text

    // Store buffer temporarily for later upload (if preview mode)
    let fileName = ""
    let labelUrl = ""

    // Only upload to storage if not in preview mode
    if (!previewOnly) {
      fileName = `${user.id}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("meesho-labels")
        .upload(fileName, buffer, {
          contentType: "application/pdf",
          upsert: false,
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("meesho-labels").getPublicUrl(fileName)
      labelUrl = urlData.publicUrl
    }

    // Split into individual orders
    const orderSections = splitIntoOrders(fullText)

    // Extract data from each order
    const extractedOrders = orderSections.map((section, index) => {
      const orderData = extractOrderFromText(section)

      return {
        order_id: orderData.orderId || `MEESHO-${Date.now()}-${index + 1}`,
        product_name: orderData.productName || null,
        sku: orderData.sku || null,
        quantity: orderData.quantity ? parseInt(orderData.quantity) : 1,
        customer_name: orderData.customerName || null,
        customer_phone: orderData.customerPhone || null,
        customer_address: orderData.customerAddress || null,
        customer_city: orderData.city || null,
        customer_state: orderData.state || null,
        customer_pincode: orderData.pincode || null,
        awb_number: orderData.awb || null,
        courier_partner: orderData.courier || null,
        status: "pending" as const,
        label_file_url: labelUrl,
        label_file_name: file.name,
        user_id: user.id,
      }
    })

    // If preview mode, return extracted data without saving
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        message: `Found ${extractedOrders.length} orders in PDF`,
        data: {
          orders: extractedOrders,
          fileName: file.name,
          fileSize: file.size,
          totalOrders: extractedOrders.length,
        },
      })
    }

    // Otherwise, insert all orders into database
    const { data: insertedOrders, error: insertError } = await supabase
      .from("meesho_orders")
      .insert(extractedOrders)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      preview: false,
      message: `Successfully created ${extractedOrders.length} orders`,
      data: {
        ordersCreated: insertedOrders?.length || 0,
        orders: insertedOrders,
        extractedData: extractedOrders, // For debugging
        rawText: fullText.substring(0, 500), // First 500 chars for debugging
      },
    })
  } catch (error: any) {
    console.error("PDF parsing error:", error)
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 })
  }
}
