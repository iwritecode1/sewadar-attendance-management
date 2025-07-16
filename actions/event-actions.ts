"use server"

import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import SewaEvent from "@/models/SewaEvent"
import { revalidatePath } from "next/cache"

export async function getEvents(params: {
  fromDate?: string
  toDate?: string
  department?: string
  place?: string
}) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const { fromDate, toDate, department, place } = params

    // Build query
    const query: any = { areaCode: session.areaCode }

    if (fromDate) {
      query.fromDate = { $gte: fromDate }
    }

    if (toDate) {
      query.toDate = { $lte: toDate }
    }

    if (department) {
      query.department = department
    }

    if (place) {
      query.place = place
    }

    const events = await SewaEvent.find(query).sort({ fromDate: -1 }).populate("createdBy", "name")

    return { success: true, data: events }
  } catch (error: any) {
    console.error("Error fetching events:", error)
    return { success: false, error: error.message || "Failed to fetch events" }
  }
}

export async function getEventById(id: string) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const event = await SewaEvent.findById(id).populate("createdBy", "name")

    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Check if user has access to this event
    if (event.areaCode !== session.areaCode) {
      return { success: false, error: "Unauthorized" }
    }

    return { success: true, data: event }
  } catch (error: any) {
    console.error("Error fetching event:", error)
    return { success: false, error: error.message || "Failed to fetch event" }
  }
}

export async function addEvent(formData: FormData) {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    const eventData = {
      place: formData.get("place") as string,
      department: formData.get("department") as string,
      fromDate: formData.get("fromDate") as string,
      toDate: formData.get("toDate") as string,
      area: session.area,
      areaCode: session.areaCode,
      createdBy: session.id,
    }

    // Validate required fields
    if (!eventData.place || !eventData.department || !eventData.fromDate || !eventData.toDate) {
      return { success: false, error: "Missing required fields" }
    }

    // Create event
    const event = await SewaEvent.create(eventData)

    revalidatePath("/attendance")

    return { success: true, data: event }
  } catch (error: any) {
    console.error("Error adding event:", error)
    return { success: false, error: error.message || "Failed to add event" }
  }
}

export async function getPlaces() {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Get distinct places from events in user's area
    const places = await SewaEvent.distinct("place", { areaCode: session.areaCode })

    return { success: true, data: places }
  } catch (error: any) {
    console.error("Error fetching places:", error)
    return { success: false, error: error.message || "Failed to fetch places" }
  }
}

export async function getDepartments() {
  const session = await getSession()

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()

    // Get distinct departments from events in user's area
    const departments = await SewaEvent.distinct("department", { areaCode: session.areaCode })

    return { success: true, data: departments }
  } catch (error: any) {
    console.error("Error fetching departments:", error)
    return { success: false, error: error.message || "Failed to fetch departments" }
  }
}
