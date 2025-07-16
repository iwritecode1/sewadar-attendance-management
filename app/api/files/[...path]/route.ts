import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { serveFile } from "@/lib/fileUpload"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const filePath = params.path.join("/")

    if (!filePath) {
      return NextResponse.json({ error: "File path required" }, { status: 400 })
    }

    const fileData = await serveFile(filePath)

    if (!fileData) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    return new NextResponse(fileData.buffer, {
      headers: {
        "Content-Type": fileData.contentType,
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    })
  } catch (error) {
    console.error("File serve error:", error)
    return NextResponse.json(
      {
        error: "Failed to serve file",
      },
      { status: 500 },
    )
  }
}
