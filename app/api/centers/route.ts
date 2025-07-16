import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import Center from "@/models/Center"
import Sewadar from "@/models/Sewadar"
import AttendanceRecord from "@/models/AttendanceRecord"
import User from "@/models/User"
import { logActivity } from "@/lib/logger"
import { validateCenterData } from "@/lib/validators"

// Create new center
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const centerData = {
      name: body.name,
      code: body.code,
      area: session.area,
      areaCode: session.areaCode,
    }

    // Validate center data
    const validation = validateCenterData(centerData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    // Check if center code already exists
    const existingCenter = await Center.findOne({ code: centerData.code })
    if (existingCenter) {
      return NextResponse.json(
        {
          error: "Center code already exists",
        },
        { status: 409 },
      )
    }

    // Check if center name already exists in the area
    const existingName = await Center.findOne({
      name: centerData.name,
      areaCode: session.areaCode,
    })
    if (existingName) {
      return NextResponse.json(
        {
          error: "Center name already exists in this area",
        },
        { status: 409 },
      )
    }

    // Create center
    const center = await Center.create({
      ...centerData,
      createdBy: session.id,
    })

    // Log activity
    await logActivity({
      userId: session.id,
      action: "CREATE_CENTER",
      details: `Created center ${centerData.name} (${centerData.code})`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json(
      {
        success: true,
        data: center,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create center error:", error)
    return NextResponse.json(
      {
        error: "Failed to create center",
      },
      { status: 500 },
    )
  }
}

// Get centers
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("includeStats") === "true"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Build query - users can only see centers from their area
    const query = { areaCode: session.areaCode }

    // Get total count
    const total = await Center.countDocuments(query)

    // Get centers
    const centers = await Center.find(query).sort({ name: 1 }).skip(skip).limit(limit)

    let centersWithStats = centers

    if (includeStats) {
      // Add statistics for each center
      centersWithStats = await Promise.all(
        centers.map(async (center) => {
          const [sewadarCount, attendanceCount, coordinatorCount] = await Promise.all([
            Sewadar.countDocuments({ centerId: center.code }),
            AttendanceRecord.countDocuments({ centerId: center.code }),
            User.countDocuments({
              role: "coordinator",
              centerId: center.code,
              isActive: true,
            }),
          ])

          return {
            ...center.toObject(),
            stats: {
              sewadarCount,
              attendanceCount,
              coordinatorCount,
            },
          }
        }),
      )
    }

    return NextResponse.json({
      success: true,
      data: centersWithStats,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get centers error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch centers",
      },
      { status: 500 },
    )
  }
}
