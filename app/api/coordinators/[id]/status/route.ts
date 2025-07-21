import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { logActivity } from "@/lib/logger"
import mongoose from "mongoose"

// Update coordinator status
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid coordinator ID" }, { status: 400 })
    }

    const coordinator = await User.findById(params.id)
    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 })
    }

    // Check permissions
    if (coordinator.areaCode !== session.areaCode) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    // If activating, check if center already has an active coordinator
    // if (isActive) {
    //   const existingCoordinator = await User.findOne({
    //     role: "coordinator",
    //     centerId: coordinator.centerId,
    //     isActive: true,
    //     _id: { $ne: params.id },
    //   })

    //   if (existingCoordinator) {
    //     return NextResponse.json(
    //       {
    //         error: "This center already has an active coordinator",
    //       },
    //       { status: 409 },
    //     )
    //   }
    // }

    // Update status
    const updatedCoordinator = await User.findByIdAndUpdate(
      params.id,
      {
        $set: {
          isActive,
          updatedAt: new Date(),
          updatedBy: session.id,
        },
      },
      { new: true },
    ).select("-password")

    // Log activity
    await logActivity({
      userId: session.id,
      action: "UPDATE_COORDINATOR_STATUS",
      details: `${isActive ? "Activated" : "Deactivated"} coordinator ${coordinator.name}`,
      ipAddress: request.ip || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: updatedCoordinator,
    })
  } catch (error) {
    console.error("Update coordinator status error:", error)
    return NextResponse.json(
      {
        error: "Failed to update coordinator status",
      },
      { status: 500 },
    )
  }
}
