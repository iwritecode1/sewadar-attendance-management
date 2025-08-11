import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"
import dbConnect from "@/lib/mongodb"
import { parseSewadarXLS } from "@/lib/xlsParser"
import Sewadar from "@/models/Sewadar"
import Center from "@/models/Center"
import { logActivity } from "@/lib/logger"
import { validateSewadarData } from "@/lib/validators"
import { v4 as uuidv4 } from "uuid"

// In-memory store for import jobs (in production, use Redis or database)
const importJobs = new Map<string, {
  status: 'processing' | 'completed' | 'failed'
  progress: number
  total: number
  processed: number
  created: number
  updated: number
  errors: Array<{ row: number; error: string; data: any }>
  message: string
  startTime: number
}>()

export async function POST(request: NextRequest) {
  const session = await getSession()

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

    // Check file size (max 50MB for large imports)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "File size too large. Maximum size is 50MB",
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
    } catch (error: any) {
      await logActivity({
        userId: session!.id,
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

    // Generate job ID and initialize job tracking
    const jobId = uuidv4()
    importJobs.set(jobId, {
      status: 'processing',
      progress: 0,
      total: parsedSewadars.length,
      processed: 0,
      created: 0,
      updated: 0,
      errors: [],
      message: 'Starting import...',
      startTime: Date.now()
    })

    // Start background processing
    processImportInBackground(jobId, parsedSewadars, session!, request.ip || "unknown", file.name)

    return NextResponse.json({
      success: true,
      jobId,
      message: `Import started for ${parsedSewadars.length} records. Use the job ID to track progress.`,
      total: parsedSewadars.length
    })
  } catch (error: any) {
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

async function processImportInBackground(
  jobId: string, 
  parsedSewadars: any[], 
  session: any, 
  ipAddress: string, 
  fileName: string
) {
  const job = importJobs.get(jobId)!
  const BATCH_SIZE = 50 // Process in batches of 50

  try {
    // Pre-fetch all centers for validation
    const centers = await Center.find({ areaCode: session.areaCode })
    const centerMap = new Map(centers.map(c => [c.code, c]))

    // Process in batches
    for (let batchStart = 0; batchStart < parsedSewadars.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, parsedSewadars.length)
      const batch = parsedSewadars.slice(batchStart, batchEnd)

      // Process batch with bulk operations
      await processBatch(batch, batchStart, centerMap, session, job)

      // Update progress
      job.processed = batchEnd
      job.progress = Math.round((batchEnd / parsedSewadars.length) * 100)
      job.message = `Processed ${batchEnd} of ${parsedSewadars.length} records...`

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Mark as completed
    job.status = 'completed'
    job.progress = 100
    job.message = `Import completed. Created: ${job.created}, Updated: ${job.updated}, Errors: ${job.errors.length}`

    // Log the import activity
    await logActivity({
      userId: session.id,
      action: "IMPORT_SEWADARS",
      details: `Imported ${job.created + job.updated} sewadars from ${fileName}. Created: ${job.created}, Updated: ${job.updated} (including temp-to-permanent conversions), Errors: ${job.errors.length}`,
      ipAddress,
    })

    // Clean up job after 5 minutes
    setTimeout(() => {
      importJobs.delete(jobId)
    }, 5 * 60 * 1000)

  } catch (error: any) {
    console.error("Background import error:", error)
    job.status = 'failed'
    job.message = `Import failed: ${error.message}`

    await logActivity({
      userId: session.id,
      action: "IMPORT_ERROR",
      details: `Import failed: ${error.message}`,
      ipAddress,
    })
  }
}

async function processBatch(
  batch: any[], 
  batchStartIndex: number, 
  centerMap: Map<string, any>, 
  session: any, 
  job: any
) {
  // Prepare bulk operations
  const bulkOps: any[] = []
  const newSewadars: any[] = []

  // Pre-fetch existing sewadars by badge numbers in this batch
  const badgeNumbers = batch.map(s => s.badgeNumber).filter(Boolean)
  const existingSewadars = await Sewadar.find({ 
    badgeNumber: { $in: badgeNumbers } 
  }).select('badgeNumber _id')
  const existingBadgeMap = new Map(existingSewadars.map(s => [s.badgeNumber, s._id]))

  // Pre-fetch potential temporary sewadars for name matching
  const nameQueries = batch
    .filter(s => s.name && s.fatherHusbandName && !existingBadgeMap.has(s.badgeNumber))
    .map(s => ({
      name: { $regex: new RegExp(`^${s.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      fatherHusbandName: { $regex: new RegExp(`^${s.fatherHusbandName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      centerId: s.centerId,
      badgeStatus: "TEMPORARY"
    }))

  const tempSewadars = nameQueries.length > 0 ? await Sewadar.find({
    $or: nameQueries
  }).select('name fatherHusbandName centerId badgeNumber _id') : []

  const tempSewadarMap = new Map(
    tempSewadars.map(s => [`${s.name.toLowerCase()}_${s.fatherHusbandName.toLowerCase()}_${s.centerId}`, s])
  )

  for (let i = 0; i < batch.length; i++) {
    const sewadarData = batch[i]
    const rowNumber = batchStartIndex + i + 2 // +2 for header row and 0-based index

    try {
      // Normalize badge status - treat anything other than PERMANENT/OPEN as TEMPORARY
      if (sewadarData.badgeStatus) {
        const normalizedStatus = sewadarData.badgeStatus.toUpperCase().trim()
        if (normalizedStatus === 'PERMANENT' || normalizedStatus === 'OPEN') {
          sewadarData.badgeStatus = normalizedStatus
        } else {
          sewadarData.badgeStatus = 'TEMPORARY'
        }
      } else {
        // Default to TEMPORARY if no badge status provided
        sewadarData.badgeStatus = 'TEMPORARY'
      }

      // Validate sewadar data
      const validation = validateSewadarData(sewadarData)
      if (!validation.isValid) {
        job.errors.push({
          row: rowNumber,
          error: validation.errors.join(", "),
          data: sewadarData,
        })
        continue
      }

      // Check if center exists
      const center = centerMap.get(sewadarData.centerId)
      if (!center) {
        job.errors.push({
          row: rowNumber,
          error: `Center with code ${sewadarData.centerId} not found`,
          data: sewadarData,
        })
        continue
      }

      // Check existing sewadar by badge number
      const existingSewadarId = existingBadgeMap.get(sewadarData.badgeNumber)
      
      if (existingSewadarId) {
        // Update existing sewadar
        bulkOps.push({
          updateOne: {
            filter: { _id: existingSewadarId },
            update: {
              $set: {
                ...sewadarData,
                updatedAt: new Date(),
                updatedBy: session.id,
              }
            }
          }
        })
        job.updated++
      } else {
        // Check for temporary sewadar match
        const tempKey = `${sewadarData.name?.toLowerCase()}_${sewadarData.fatherHusbandName?.toLowerCase()}_${sewadarData.centerId}`
        const tempSewadar = tempSewadarMap.get(tempKey)

        if (tempSewadar) {
          // Check for badge number conflict
          if (existingBadgeMap.has(sewadarData.badgeNumber)) {
            job.errors.push({
              row: rowNumber,
              error: `Badge number ${sewadarData.badgeNumber} already exists for another sewadar`,
              data: sewadarData,
            })
            continue
          }

          // Update temporary sewadar
          bulkOps.push({
            updateOne: {
              filter: { _id: tempSewadar._id },
              update: {
                $set: {
                  ...sewadarData,
                  updatedAt: new Date(),
                  updatedBy: session.id,
                }
              }
            }
          })
          job.updated++
        } else {
          // Create new sewadar
          newSewadars.push({
            ...sewadarData,
            createdBy: session.id,
            updatedBy: session.id,
          })
          job.created++
        }
      }
    } catch (error: any) {
      job.errors.push({
        row: rowNumber,
        error: error.message || "Unknown error occurred",
        data: sewadarData,
      })
    }
  }

  // Execute bulk operations
  if (bulkOps.length > 0) {
    await Sewadar.bulkWrite(bulkOps, { ordered: false })
  }

  // Insert new sewadars
  if (newSewadars.length > 0) {
    await Sewadar.insertMany(newSewadars, { ordered: false })
  }
}

// Get import progress
export async function GET(request: NextRequest) {
  const session = await getSession()

  try {
    if (!isAuthorized(session, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    const job = importJobs.get(jobId)
    if (!job) {
      return NextResponse.json({ error: "Job not found or expired" }, { status: 404 })
    }

    return NextResponse.json({
      jobId,
      status: job.status,
      progress: job.progress,
      total: job.total,
      processed: job.processed,
      created: job.created,
      updated: job.updated,
      errors: job.errors,
      message: job.message,
      duration: Date.now() - job.startTime
    })
  } catch (error: any) {
    console.error("Progress check error:", error)
    return NextResponse.json(
      {
        error: "Failed to check import progress",
      },
      { status: 500 },
    )
  }
}