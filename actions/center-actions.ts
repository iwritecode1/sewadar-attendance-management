"use server"

import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import Center from "@/models/Center"
import Sewadar from "@/models/Sewadar"
import AttendanceRecord from "@/models/AttendanceRecord"
import { revalidatePath } from "next/cache"

export async function getCenters() {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Users can only see centers from their area
    const centers = await Center.find({ areaCode: session.areaCode }).sort({ name: 1 })

    return { success: true, data: centers }
  } catch (error: any) {
    console.error("Error fetching centers:", error)
    return { success: false, error: error.message || "Failed to fetch centers" }
  }
}

export async function getCenterById(id: string) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const center = await Center.findById(id)

    if (!center) {
      return { success: false, error: "Center not found" }
    }

    // Check if user has access to this center
    if (center.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    return { success: true, data: center }
  } catch (error: any) {
    console.error("Error fetching center:", error)
    return { success: false, error: error.message || "Failed to fetch center" }
  }
}

export async function addCenter(formData: FormData) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const centerData = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      area: session.area,
      areaCode: session.areaCode,
    }

    // Validate required fields
    if (!centerData.name || !centerData.code) {
      return { success: false, error: "Missing required fields" }
    }

    // Check if center code already exists
    const existingCenter = await Center.findOne({ code: centerData.code })

    if (existingCenter) {
      return { success: false, error: "Center code already exists" }
    }

    // Create center
    const center = await Center.create(centerData)

    revalidatePath("/centers")

    return { success: true, data: center }
  } catch (error: any) {
    console.error("Error adding center:", error)
    return { success: false, error: error.message || "Failed to add center" }
  }
}

export async function updateCenter(id: string, formData: FormData) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Find center
    const center = await Center.findById(id)

    if (!center) {
      return { success: false, error: "Center not found" }
    }

    // Check if user has access to this center
    if (center.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    const centerData = {
      name: formData.get("name") as string,
    }

    // Validate required fields
    if (!centerData.name) {
      return { success: false, error: "Missing required fields" }
    }

    // Update center
    const updatedCenter = await Center.findByIdAndUpdate(id, { $set: centerData }, { new: true })

    revalidatePath("/centers")

    return { success: true, data: updatedCenter }
  } catch (error: any) {
    console.error("Error updating center:", error)
    return { success: false, error: error.message || "Failed to update center" }
  }
}

export async function deleteCenter(id: string) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Find center
    const center = await Center.findById(id)

    if (!center) {
      return { success: false, error: "Center not found" }
    }

    // Check if user has access to this center
    if (center.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if center has sewadars
    const sewadarCount = await Sewadar.countDocuments({ centerId: center.code })

    if (sewadarCount > 0) {
      return {
        success: false,
        error: `Cannot delete center with ${sewadarCount} sewadars. Please reassign or delete them first.`,
      }
    }

    // Check if center has attendance records
    const attendanceCount = await AttendanceRecord.countDocuments({ centerId: center.code })

    if (attendanceCount > 0) {
      return {
        success: false,
        error: `Cannot delete center with ${attendanceCount} attendance records.`,
      }
    }

    // Delete center
    await Center.findByIdAndDelete(id)

    revalidatePath("/centers")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting center:", error)
    return { success: false, error: error.message || "Failed to delete center" }
  }
}

export async function getCenterStats(centerId: string) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Find center
    const center = await Center.findOne({ code: centerId })

    if (!center) {
      return { success: false, error: "Center not found" }
    }

    // Check if user has access to this center
    if (center.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    // Get stats
    const sewadarCount = await Sewadar.countDocuments({ centerId })

    const maleCount = await Sewadar.countDocuments({ centerId, gender: "MALE" })
    const femaleCount = await Sewadar.countDocuments({ centerId, gender: "FEMALE" })

    const permanentCount = await Sewadar.countDocuments({ centerId, badgeStatus: "PERMANENT" })
    const temporaryCount = await Sewadar.countDocuments({ centerId, badgeStatus: "TEMPORARY" })
    const openCount = await Sewadar.countDocuments({ centerId, badgeStatus: "OPEN" })

    const attendanceRecords = await AttendanceRecord.countDocuments({ centerId })

    // Get department distribution
    const departments = await Sewadar.aggregate([
      { $match: { centerId } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    return {
      success: true,
      data: {
        sewadarCount,
        maleCount,
        femaleCount,
        permanentCount,
        temporaryCount: openCount,
        attendanceRecords,
        departments: departments.map((d) => ({ department: d._id, count: d.count })),
      },
    }
  } catch (error: any) {
    console.error("Error fetching center stats:", error)
    return { success: false, error: error.message || "Failed to fetch center stats" }
  }
}
