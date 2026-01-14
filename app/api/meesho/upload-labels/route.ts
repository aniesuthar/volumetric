import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_${file.name}`
    const fileBuffer = await file.arrayBuffer()

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("meesho-labels")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from("meesho-labels")
      .getPublicUrl(fileName)

    return NextResponse.json({
      data: {
        url: urlData.publicUrl,
        fileName: file.name,
        path: fileName
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
