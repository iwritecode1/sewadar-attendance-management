import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import Center from "@/models/Center"
import { logActivity } from "@/lib/logger"
import { validateCoordinatorData } from "@/lib/validators"

// Create new coordinator
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const coordinatorData = {
      name: body.name,
      username: body.username,
      password: body.password,
      role: "coordinator" as const,
      area: session.area,
      areaCode: session.areaCode,
      centerId: body.centerId,
      isActive: true,
    }

    // Validate coordinator data
    const validation = validateCoordinatorData(coordinatorData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: coordinatorData.username })
    if (existingUser) {
      return NextResponse.json(
        {
          error: "Username already exists",
        },
        { status: 409 },
      )
    }

    // Verify center exists and belongs to user's area
    const center = await Center.findOne({
      code: coordinatorData.centerId,
      areaCode: session.areaCode,
    })

    if (!center) {
      return NextResponse.json(
        {
          error: "Center not found or does not belong to your area",
        },
        { status: 404 },
      )
    }

    // Check if center already has an active coordinator
    // const existingCoordinator = await User.findOne({
    //   role: "coordinator",
    //   centerId: coordinatorData.centerId,
    //   isActive: true,
    // })

    // if (existingCoordinator) {
    //   return NextResponse.json(
    //     {
    //       error: "This center already has an active coordinator",
    //     },
    //     { status: 409 },
    //   )
    // }

    // Create coordinator
    const coordinator = await User.create({
      ...coordinatorData,
      centerName: center.name,
      createdBy: session.id,
    })

    // Remove password from response
    const responseData = coordinator.toObject()
    delete responseData.password

    // Log activity
    await logActivity({
      userId: session.id,
      action: "CREATE_COORDINATOR",
      details: `Created coordinator ${coordinatorData.name} for center ${center.name}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create coordinator error:", error)
    return NextResponse.json(
      {
        error: "Failed to create coordinator",
      },
      { status: 500 },
    )
  }
}

// Get coordinators
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get("centerId")
    const isActive = searchParams.get("isActive")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Build query
    const query: any = {
      role: "coordinator",
      areaCode: session.areaCode,
    }

    if (centerId) {
      query.centerId = centerId
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === "true"
    }

    // Get total count
    const total = await User.countDocuments(query)

    // Get coordinators
    const coordinators = await User.find(query).select("-password").sort({ name: 1 }).skip(skip).limit(limit)

    return NextResponse.json({
      success: true,
      data: coordinators,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get coordinators error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch coordinators",
      },
      { status: 500 },
    )
  }
}
