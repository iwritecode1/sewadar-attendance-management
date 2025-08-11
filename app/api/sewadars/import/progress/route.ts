import { type NextRequest } from "next/server"
import { getSession, isAuthorized } from "@/lib/auth"

// This would be the same import jobs store from the main import route
// In production, this should be moved to a shared Redis store or database
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

export async function GET(request: NextRequest) {
  const session = await getSession()

  try {
    if (!isAuthorized(session, "admin")) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return new Response("Job ID required", { status: 400 })
    }

    // Set up Server-Sent Events
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const sendUpdate = () => {
          const job = importJobs.get(jobId)
          
          if (!job) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Job not found" })}\n\n`))
            controller.close()
            return
          }

          const update = {
            jobId,
            status: job.status,
            progress: job.progress,
            total: job.total,
            processed: job.processed,
            created: job.created,
            updated: job.updated,
            errors: job.errors.length,
            message: job.message,
            duration: Date.now() - job.startTime
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`))

          // Stop streaming if job is completed or failed
          if (job.status === 'completed' || job.status === 'failed') {
            controller.close()
            return
          }

          // Continue polling
          setTimeout(sendUpdate, 1000)
        }

        // Start sending updates
        sendUpdate()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error("SSE error:", error)
    return new Response("Internal server error", { status: 500 })
  }
}