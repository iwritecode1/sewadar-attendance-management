"use server"

import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import AttendanceRecord, { type ITempSewadar } from "@/models/AttendanceRecord"
import SewaEvent from "@/models/SewaEvent"
import Sewadar from "@/models/Sewadar"
import mongoose from "mongoose"
import { revalidatePath } from "next/cache"

export async function addAttendance(formData: FormData) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const eventId = formData.get("eventId") as string
    const sewadarIds = formData.getAll("sewadarIds[]").map((id) => id.toString())
    const tempSewadarsJson = formData.get("tempSewadars") as string
    const tempSewadars = tempSewadarsJson ? (JSON.parse(tempSewadarsJson) as ITempSewadar[]) : []

    // Validate event ID
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return { success: false, error: "Invalid event ID" }
    }

    // Check if event exists
    const event = await SewaEvent.findById(eventId)
    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Check if user has access to this event
    if (event.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    // For coordinators, ensure they're submitting for their center
    if (session.role === "coordinator" && !session.centerId) {
      return { success: false, error: "Coordinator must have an assigned center" }
    }

    // Validate sewadar IDs
    if (sewadarIds.length > 0) {
      for (const id of sewadarIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return { success: false, error: `Invalid sewadar ID: ${id}` }
        }
      }

      // If coordinator, ensure all sewadars belong to their center
      if (session.role === "coordinator") {
        const sewadars = await Sewadar.find({
          _id: { $in: sewadarIds },
          centerId: { $ne: session.centerId },
        })

        if (sewadars.length > 0) {
          return { success: false, error: "Some sewadars do not belong to your center" }
        }
      }
    }

    // Process file uploads for nominal roll images
    const nominalRollImages: string[] = []
    // This would typically involve uploading to a storage service
    // For now, we'll just store the file names
    const files = formData.getAll("nominalRollImages[]")
    for (const file of files) {
      if (file instanceof File) {
        // In a real implementation, upload the file and get the URL
        nominalRollImages.push(file.name)
      }
    }

    // Create attendance record
    const attendanceData = {
      eventId: new mongoose.Types.ObjectId(eventId),
      centerId: session.role === "coordinator" ? session.centerId! : (formData.get("centerId") as string),
      centerName: session.role === "coordinator" ? session.centerName! : (formData.get("centerName") as string),
      area: session.area,
      areaCode: session.areaCode,
      sewadars: sewadarIds.map((id) => new mongoose.Types.ObjectId(id)),
      tempSewadars,
      nominalRollImages,
      submittedBy: new mongoose.Types.ObjectId(session.id),
    }

    const attendance = await AttendanceRecord.create(attendanceData)

    revalidatePath("/attendance")
    revalidatePath("/lookup")

    return { success: true, data: attendance }
  } catch (error: any) {
    console.error("Error adding attendance:", error)
    return { success: false, error: error.message || "Failed to add attendance" }
  }
}

export async function getAttendanceRecords(params: {
  eventId?: string
  centerId?: string
  fromDate?: string
  toDate?: string
}) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const { eventId, centerId, fromDate, toDate } = params

    // Build query
    const query: any = { areaCode: session.areaCode }

    if (eventId) {
      query.eventId = new mongoose.Types.ObjectId(eventId)
    }

    // For coordinators, restrict to their center
    if (session.role === "coordinator") {
      query.centerId = session.centerId
    } else if (centerId) {
      query.centerId = centerId
    }

    // Date range filtering via event lookup
    if (fromDate || toDate) {
      const eventQuery: any = {}

      if (fromDate) {
        eventQuery.fromDate = { $gte: fromDate }
      }

      if (toDate) {
        eventQuery.toDate = { $lte: toDate }
      }

      const events = await SewaEvent.find(eventQuery).select("_id")
      query.eventId = { $in: events.map((e) => e._id) }
    }

    const records = await AttendanceRecord.find(query)
      .populate("eventId", "place department fromDate toDate")
      .populate("submittedBy", "name")
      .sort({ submittedAt: -1 })

    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching attendance records:", error)
    return { success: false, error: error.message || "Failed to fetch attendance records" }
  }
}

export async function getSewadarAttendance(sewadarId: string) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Validate sewadar ID
    if (!mongoose.Types.ObjectId.isValid(sewadarId)) {
      return { success: false, error: "Invalid sewadar ID" }
    }

    // Get sewadar to check permissions
    const sewadar = await Sewadar.findById(sewadarId)

    if (!sewadar) {
      return { success: false, error: "Sewadar not found" }
    }

    // Check if user has access to this sewadar
    if (sewadar.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    if (session.role === "coordinator" && sewadar.centerId !== session.centerId) {
      return { success: false, error: "Unauthorized" }
    }

    // Find attendance records where this sewadar is included
    const records = await AttendanceRecord.find({
      sewadars: new mongoose.Types.ObjectId(sewadarId),
    })
      .populate("eventId", "place department fromDate toDate")
      .sort({ submittedAt: -1 })

    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching sewadar attendance:", error)
    return { success: false, error: error.message || "Failed to fetch sewadar attendance" }
  }
}
