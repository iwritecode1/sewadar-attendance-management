import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()

    if (session) {
      return NextResponse.json({success: true, user: session})
    }

    return NextResponse.json({ error: "No session" }, { status: 401 })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
