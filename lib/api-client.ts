interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string[]
  pagination?: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: any
  headers?: Record<string, string>
  params?: Record<string, string>
}

class ApiClient {
  private baseUrl = "/api"

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      // Handle CSV responses
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("text/csv")) {
        const csvText = await response.text()
        return { success: true, data: csvText }
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error: any) {
      // Don't log AbortErrors as they are intentional cancellations
      if (error.name !== 'AbortError') {
        console.error(`API request failed: ${endpoint}`, error)
      }
      throw error
    }
  }

  // Authentication APIs
  async login(credentials: { username: string; password: string }) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  }

  async logout() {
    return this.request("/auth/logout", {
      method: "POST",
    })
  }

  async getSession() {
    return this.request("/auth/session")
  }

  // Sewadar APIs
  async getSewadars(params?: {
    centerId?: string
    search?: string
    department?: string
    gender?: string
    badgeStatus?: string
    includeStats?: boolean
    page?: number
    limit?: number
    signal?: AbortSignal
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'signal') {
          searchParams.append(key, value.toString())
        }
      })
    }
    return this.request(`/sewadars?${searchParams.toString()}`, {
      signal: params?.signal
    })
  }

  async getSewadar(id: string) {
    return this.request(`/sewadars/${id}`)
  }

  async createSewadar(data: any) {
    return this.request("/sewadars", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateSewadar(id: string, data: any) {
    return this.request(`/sewadars/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteSewadar(id: string) {
    return this.request(`/sewadars/${id}`, {
      method: "DELETE",
    })
  }

  async importSewadars(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    return fetch(`${this.baseUrl}/sewadars/import`, {
      method: "POST",
      body: formData,
    }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Import failed")
      }
      return data
    })
  }

  // Attendance APIs
  async getAttendance(params?: {
    eventId?: string
    centerId?: string
    fromDate?: string
    toDate?: string
    page?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
    }
    return this.request(`/attendance?${searchParams.toString()}`)
  }

  async getAttendanceRecord(id: string) {
    return this.request(`/attendance/${id}`)
  }

  async createAttendance(data: {
    eventId: string
    centerId?: string
    centerName?: string
    sewadarIds: string[]
    tempSewadars: any[]
    nominalRollImages: File[]
  }) {
    const formData = new FormData()

    formData.append("eventId", data.eventId)
    if (data.centerId) formData.append("centerId", data.centerId)
    if (data.centerName) formData.append("centerName", data.centerName)

    data.sewadarIds.forEach((id) => formData.append("sewadarIds[]", id))
    formData.append("tempSewadars", JSON.stringify(data.tempSewadars))

    data.nominalRollImages.forEach((file) => formData.append("nominalRollImages[]", file))

    return fetch(`${this.baseUrl}/attendance`, {
      method: "POST",
      body: formData,
    }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create attendance")
      }
      return data
    })
  }

  async updateAttendance(id: string, data: any) {
    const formData = new FormData()

    data.sewadarIds.forEach((id: string) => formData.append("sewadarIds[]", id))
    formData.append("tempSewadars", JSON.stringify(data.tempSewadars))

    if (data.nominalRollImages) {
      data.nominalRollImages.forEach((file: File) => formData.append("nominalRollImages[]", file))
    }

    return this.request(`/attendance/${id}`, {
      method: "PUT",
      body: formData,
    })
  }

  async deleteAttendance(id: string) {
    return this.request(`/attendance/${id}`, {
      method: "DELETE",
    })
  }

  // Event APIs
  async getEvents(params?: {
    fromDate?: string
    toDate?: string
    department?: string
    place?: string
    includeStats?: boolean
    forAttendance?: boolean
    page?: number
    limit?: number
    signal?: AbortSignal
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'signal') {
          searchParams.append(key, value.toString())
        }
      })
    }
    return this.request(`/events?${searchParams.toString()}`, {
      signal: params?.signal
    })
  }

  async getEvent(id: string) {
    return this.request(`/events/${id}`)
  }

  async createEvent(data: {
    place: string
    department: string
    fromDate: string
    toDate: string
  }) {
    return this.request("/events", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateEvent(id: string, data: any) {
    return this.request(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteEvent(id: string) {
    return this.request(`/events/${id}`, {
      method: "DELETE",
    })
  }

  // Center APIs
  async getCenters(params?: {
    includeStats?: boolean
    page?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
    }
    return this.request(`/centers?${searchParams.toString()}`)
  }

  async getCenter(id: string) {
    return this.request(`/centers/${id}`)
  }

  async createCenter(data: {
    name: string
    code: string
  }) {
    return this.request("/centers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateCenter(id: string, data: { name: string }) {
    return this.request(`/centers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteCenter(id: string) {
    return this.request(`/centers/${id}`, {
      method: "DELETE",
    })
  }

  // Coordinator APIs
  async getCoordinators(params?: {
    centerId?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
    }
    return this.request(`/coordinators?${searchParams.toString()}`)
  }

  async getCoordinator(id: string) {
    return this.request(`/coordinators/${id}`)
  }

  async createCoordinator(data: {
    name: string
    username: string
    password: string
    centerId: string
  }) {
    return this.request("/coordinators", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateCoordinator(
    id: string,
    data: {
      name: string
      username: string
      password?: string
      centerId: string
      isActive: boolean
    },
  ) {
    return this.request(`/coordinators/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async updateCoordinatorStatus(id: string, isActive: boolean) {
    return this.request(`/coordinators/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    })
  }

  async deleteCoordinator(id: string) {
    return this.request(`/coordinators/${id}`, {
      method: "DELETE",
    })
  }

  // Reports APIs
  async getAttendanceReport(params: {
    sewadarId?: string
    eventId?: string
    centerId?: string
    fromDate?: string
    toDate?: string
    format?: "json" | "csv"
  }) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString())
      }
    })

    const headers: Record<string, string> = {}
    if (params.format === "csv") {
      headers["Accept"] = "text/csv"
    }

    return this.request(`/reports/attendance?${searchParams.toString()}`, {
      headers,
    })
  }

  // Dashboard APIs
  async getDashboardStats() {
    return this.request("/dashboard/stats")
  }

  // Places and Departments (for dropdowns)
  async getPlaces() {
    return this.request("/events").then((response) => {
      if (response.success && response.data) {
        const places = [...new Set(response.data.map((event: any) => event.place))]
        return { success: true, data: places }
      }
      return { success: false, data: [] }
    })
  }

  async getDepartments() {
    return this.request("/events").then((response) => {
      if (response.success && response.data) {
        const departments = [...new Set(response.data.map((event: any) => event.department))]
        return { success: true, data: departments }
      }
      return { success: false, data: [] }
    })
  }

  // Profile APIs
  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }) {
    return this.request("/profile/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient()
