"use server"

import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import Center from "@/models/Center"
import { revalidatePath } from "next/cache"

export async function getCoordinators() {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Get coordinators from user's area
    const coordinators = await User.find({
      role: "coordinator",
      areaCode: session.areaCode,
    })
      .select("-password")
      .sort({ name: 1 })

    return { success: true, data: coordinators }
  } catch (error: any) {
    console.error("Error fetching coordinators:", error)
    return { success: false, error: error.message || "Failed to fetch coordinators" }
  }
}

export async function addCoordinator(formData: FormData) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const coordinatorData = {
      name: formData.get("name") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      role: "coordinator" as const,
      area: session.area,
      areaCode: session.areaCode,
      centerId: formData.get("centerId") as string,
      isActive: true,
    }

    // Validate required fields
    if (!coordinatorData.name || !coordinatorData.username || !coordinatorData.password || !coordinatorData.centerId) {
      return { success: false, error: "Missing required fields" }
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: coordinatorData.username })

    if (existingUser) {
      return { success: false, error: "Username already exists" }
    }

    // Check if center exists
    const center = await Center.findOne({ code: coordinatorData.centerId, areaCode: session.areaCode })

    if (!center) {
      return { success: false, error: "Center not found" }
    }

    // Check if center already has an active coordinator
    const existingCoordinator = await User.findOne({
      role: "coordinator",
      centerId: coordinatorData.centerId,
      isActive: true,
    })

    if (existingCoordinator) {
      return { success: false, error: "This center already has an active coordinator" }
    }

    // Add center name
    coordinatorData.centerName = center.name

    // Create coordinator
    const coordinator = await User.create(coordinatorData)

    revalidatePath("/coordinators")

    return { success: true, data: { ...coordinator.toObject(), password: undefined } }
  } catch (error: any) {
    console.error("Error adding coordinator:", error)
    return { success: false, error: error.message || "Failed to add coordinator" }
  }
}

export async function updateCoordinatorStatus(id: string, isActive: boolean) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Find coordinator
    const coordinator = await User.findById(id)

    if (!coordinator) {
      return { success: false, error: "Coordinator not found" }
    }

    // Check if user has access to this coordinator
    if (coordinator.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    // If activating, check if center already has an active coordinator
    if (isActive) {
      const existingCoordinator = await User.findOne({
        role: "coordinator",
        centerId: coordinator.centerId,
        isActive: true,
        _id: { $ne: id },
      })

      if (existingCoordinator) {
        return { success: false, error: "This center already has an active coordinator" }
      }
    }

    // Update status
    const updatedCoordinator = await User.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).select(
      "-password",
    )

    revalidatePath("/coordinators")

    return { success: true, data: updatedCoordinator }
  } catch (error: any) {
    console.error("Error updating coordinator status:", error)
    return { success: false, error: error.message || "Failed to update coordinator status" }
  }
}

export async function deleteCoordinator(id: string) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Find coordinator
    const coordinator = await User.findById(id)

    if (!coordinator) {
      return { success: false, error: "Coordinator not found" }
    }

    // Check if user has access to this coordinator
    if (coordinator.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    // Delete coordinator
    await User.findByIdAndDelete(id)

    revalidatePath("/coordinators")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting coordinator:", error)
    return { success: false, error: error.message || "Failed to delete coordinator" }
  }
}
