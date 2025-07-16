import { NextResponse } from "next/server"

export async function GET() {
  const apiDocs = {
    title: "RSSB Sewadar Attendance Management API",
    version: "1.0.0",
    description: "Comprehensive API for managing sewadar attendance, events, centers, and coordinators",
    baseUrl: "/api",
    endpoints: {
      authentication: {
        "POST /auth/login": "User login",
        "POST /auth/logout": "User logout",
        "GET /auth/session": "Get current session",
      },
      sewadars: {
        "GET /sewadars": "Get sewadars with filtering and pagination",
        "POST /sewadars": "Create new sewadar",
        "GET /sewadars/{id}": "Get single sewadar with attendance history",
        "PUT /sewadars/{id}": "Update sewadar",
        "DELETE /sewadars/{id}": "Delete sewadar",
        "POST /sewadars/import": "Import sewadars from Excel file",
      },
      attendance: {
        "GET /attendance": "Get attendance records with filtering",
        "POST /attendance": "Create new attendance record",
        "GET /attendance/{id}": "Get single attendance record",
        "PUT /attendance/{id}": "Update attendance record",
        "DELETE /attendance/{id}": "Delete attendance record",
      },
      events: {
        "GET /events": "Get events with filtering and statistics",
        "POST /events": "Create new event",
        "GET /events/{id}": "Get single event with statistics",
        "PUT /events/{id}": "Update event",
        "DELETE /events/{id}": "Delete event",
      },
      centers: {
        "GET /centers": "Get centers with statistics",
        "POST /centers": "Create new center",
        "GET /centers/{id}": "Get single center with detailed statistics",
        "PUT /centers/{id}": "Update center",
        "DELETE /centers/{id}": "Delete center",
      },
      coordinators: {
        "GET /coordinators": "Get coordinators with filtering",
        "POST /coordinators": "Create new coordinator",
        "GET /coordinators/{id}": "Get single coordinator",
        "PUT /coordinators/{id}": "Update coordinator",
        "DELETE /coordinators/{id}": "Delete coordinator",
      },
      dashboard: {
        "GET /dashboard/stats": "Get comprehensive dashboard statistics",
      },
      files: {
        "GET /files/{path}": "Serve uploaded files",
      },
    },
    authentication: {
      type: "JWT",
      description: "JWT tokens stored in HTTP-only cookies",
    },
    authorization: {
      roles: ["admin", "coordinator"],
      description: "Role-based access control with area-level restrictions",
    },
    errorHandling: {
      format: "JSON",
      structure: {
        error: "Error message",
        details: "Additional error details (optional)",
      },
    },
    pagination: {
      parameters: ["page", "limit"],
      response: {
        data: "Array of results",
        pagination: {
          total: "Total count",
          page: "Current page",
          limit: "Items per page",
          pages: "Total pages",
        },
      },
    },
  }

  return NextResponse.json(apiDocs)
}
