"use server"

import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import { parseSewadarXLS } from "@/lib/xlsParser"
import Sewadar from "@/models/Sewadar"
import { revalidatePath } from "next/cache"

export async function importSewadars(formData: FormData) {
  const session = await getSession()

  if (!isAuthorized(session, "admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const file = formData.get("file") as File

    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Check file type
    if (!file.name.endsWith(".xls") && !file.name.endsWith(".xlsx")) {
      return { success: false, error: "Only .xls or .xlsx files are supported" }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse the Excel file
    const sewadars = parseSewadarXLS(buffer)

    if (sewadars.length === 0) {
      return { success: false, error: "No valid sewadar records found in the file" }
    }

    // Connect to database
    await dbConnect()

    // Process each sewadar
    let updated = 0
    let created = 0

    for (const sewadarData of sewadars) {
      if (!sewadarData.badgeNumber) continue

      // Check if sewadar exists
      const existingSewadar = await Sewadar.findOne({ badgeNumber: sewadarData.badgeNumber })

      if (existingSewadar) {
        // Update existing sewadar
        await Sewadar.updateOne(
          { badgeNumber: sewadarData.badgeNumber },
          { $set: { ...sewadarData, updatedAt: new Date() } },
        )
        updated++
      } else {
        // Create new sewadar
        await Sewadar.create(sewadarData)
        created++
      }
    }

    revalidatePath("/sewadars")

    return {
      success: true,
      message: `Successfully processed ${sewadars.length} records. Created: ${created}, Updated: ${updated}`,
    }
  } catch (error: any) {
    console.error("Error importing sewadars:", error)
    return { success: false, error: error.message || "Failed to import sewadars" }
  }
}

export async function getSewadars(params: {
  centerId?: string
  search?: string
  department?: string
  gender?: string
  page?: number
  limit?: number
}) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const { centerId, search, department, gender, page = 1, limit = 50 } = params
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}

    // Area restriction - users can only see sewadars from their area
    query.areaCode = session.areaCode

    // Center restriction - coordinators can only see sewadars from their center
    if (session.role === "coordinator" && session.centerId) {
      query.centerId = session.centerId
    } else if (centerId) {
      query.centerId = centerId
    }

    // Other filters
    if (department && department !== "all") {
      query.department = department
    }

    if (gender && gender !== "all") {
      query.gender = gender
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { badgeNumber: { $regex: search, $options: "i" } },
        { fatherHusbandName: { $regex: search, $options: "i" } },
      ]
    }

    // Execute query
    const sewadars = await Sewadar.find(query).sort({ name: 1 }).skip(skip).limit(limit)

    const total = await Sewadar.countDocuments(query)

    return {
      success: true,
      data: sewadars,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }
  } catch (error: any) {
    console.error("Error fetching sewadars:", error)
    return { success: false, error: error.message || "Failed to fetch sewadars" }
  }
}

export async function getSewadarById(id: string) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const sewadar = await Sewadar.findById(id)

    if (!sewadar) {
      return { success: false, error: "Sewadar not found" }
    }

    // Check if user has access to this sewadar
    if (session.role === "coordinator" && session.centerId !== sewadar.centerId) {
      return { success: false, error: "Unauthorized" }
    }

    if (session.areaCode !== sewadar.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    return { success: true, data: sewadar }
  } catch (error: any) {
    console.error("Error fetching sewadar:", error)
    return { success: false, error: error.message || "Failed to fetch sewadar" }
  }
}

export async function addSewadar(formData: FormData) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const sewadarData = {
      badgeNumber: formData.get("badgeNumber") as string,
      name: formData.get("name") as string,
      fatherHusbandName: formData.get("fatherHusbandName") as string,
      dob: formData.get("dob") as string,
      gender: formData.get("gender") as "MALE" | "FEMALE",
      badgeStatus: formData.get("badgeStatus") as "PERMANENT" | "TEMPORARY" | "OPEN",
      zone: formData.get("zone") as string,
      area: session.area,
      areaCode: session.areaCode,
      center: formData.get("center") as string,
      centerId: formData.get("centerId") as string,
      department: formData.get("department") as string,
      contactNo: formData.get("contactNo") as string,
      emergencyContact: formData.get("emergencyContact") as string,
    }

    // Validate required fields
    if (!sewadarData.badgeNumber || !sewadarData.name || !sewadarData.centerId) {
      return { success: false, error: "Missing required fields" }
    }

    // Check if coordinator has access to this center
    if (session.role === "coordinator" && session.centerId !== sewadarData.centerId) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if badge number already exists
    const existingSewadar = await Sewadar.findOne({ badgeNumber: sewadarData.badgeNumber })

    if (existingSewadar) {
      return { success: false, error: "Badge number already exists" }
    }

    // Create sewadar
    const sewadar = await Sewadar.create(sewadarData)

    revalidatePath("/sewadars")

    return { success: true, data: sewadar }
  } catch (error: any) {
    console.error("Error adding sewadar:", error)
    return { success: false, error: error.message || "Failed to add sewadar" }
  }
}
