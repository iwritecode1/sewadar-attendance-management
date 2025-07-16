import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import { parseSewadarXLS } from "@/lib/xlsParser"
import Sewadar from "@/models/Sewadar"
import Center from "@/models/Center"
import { logActivity } from "@/lib/logger"
import { validateSewadarData } from "@/lib/validators"

export async function POST(request: NextRequest) {
  const session = await getSession() // Declare session variable here

  try {
    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".xls") && !file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        {
          error: "Invalid file format. Only .xls and .xlsx files are supported",
        },
        { status: 400 },
      )
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "File size too large. Maximum size is 10MB",
        },
        { status: 400 },
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse the Excel file
    let parsedSewadars
    try {
      parsedSewadars = parseSewadarXLS(buffer)
    } catch (error) {
      await logActivity({
        userId: session.id,
        action: "IMPORT_FAILED",
        details: `Failed to parse Excel file: ${error.message}`,
        ipAddress: request.ip || "unknown",
      })

      return NextResponse.json(
        {
          error: "Failed to parse Excel file. Please check the file format and try again.",
        },
        { status: 400 },
      )
    }

    if (parsedSewadars.length === 0) {
      return NextResponse.json(
        {
          error: "No valid sewadar records found in the file",
        },
        { status: 400 },
      )
    }

    // Validate and process sewadars
    const results = {
      total: parsedSewadars.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>,
    }

    for (let i = 0; i < parsedSewadars.length; i++) {
      const sewadarData = parsedSewadars[i]

      try {
        // Validate sewadar data
        const validation = validateSewadarData(sewadarData)
        if (!validation.isValid) {
          results.errors.push({
            row: i + 2, // +2 for header row and 0-based index
            error: validation.errors.join(", "),
            data: sewadarData,
          })
          continue
        }

        // Check if center exists
        const center = await Center.findOne({ code: sewadarData.centerId })
        if (!center) {
          results.errors.push({
            row: i + 2,
            error: `Center with code ${sewadarData.centerId} not found`,
            data: sewadarData,
          })
          continue
        }

        // Ensure area matches user's area
        if (center.areaCode !== session.areaCode) {
          results.errors.push({
            row: i + 2,
            error: `Center ${sewadarData.centerId} does not belong to your area`,
            data: sewadarData,
          })
          continue
        }

        // Check if sewadar exists
        const existingSewadar = await Sewadar.findOne({
          badgeNumber: sewadarData.badgeNumber,
        })

        if (existingSewadar) {
          // Update existing sewadar
          await Sewadar.updateOne(
            { badgeNumber: sewadarData.badgeNumber },
            {
              $set: {
                ...sewadarData,
                updatedAt: new Date(),
                updatedBy: session.id,
              },
            },
          )
          results.updated++
        } else {
          // Create new sewadar
          await Sewadar.create({
            ...sewadarData,
            createdBy: session.id,
            updatedBy: session.id,
          })
          results.created++
        }
      } catch (error) {
        results.errors.push({
          row: i + 2,
          error: error.message || "Unknown error occurred",
          data: sewadarData,
        })
      }
    }

    // Log the import activity
    await logActivity({
      userId: session.id,
      action: "IMPORT_SEWADARS",
      details: `Imported ${results.created + results.updated} sewadars from ${file.name}. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: `Import completed. Created: ${results.created}, Updated: ${results.updated}`,
      results,
    })
  } catch (error) {
    console.error("Import error:", error)

    await logActivity({
      userId: session?.id || "unknown",
      action: "IMPORT_ERROR",
      details: `Import failed: ${error.message}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json(
      {
        error: "Internal server error during import",
      },
      { status: 500 },
    )
  }
}

// Get import progress (for future implementation with background jobs)
export async function GET(request: NextRequest) {
  const session = await getSession() // Declare session variable here

  try {
    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    // This would typically check a job queue or cache for progress
    // For now, return a placeholder response
    return NextResponse.json({
      jobId,
      status: "completed",
      progress: 100,
      message: "Import completed successfully",
    })
  } catch (error) {
    console.error("Progress check error:", error)
    return NextResponse.json(
      {
        error: "Failed to check import progress",
      },
      { status: 500 },
    )
  }
}
