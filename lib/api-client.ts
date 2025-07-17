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

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = "GET", body, headers = {}, params } = options

    // Build URL with query parameters
    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString())
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      credentials: "include", // Include cookies for authentication
    }

    if (body) {
      if (body instanceof FormData) {
        // Remove Content-Type header for FormData to let browser set it with boundary
        delete config.headers!["Content-Type"]
        config.body = body
      } else {
        config.body = JSON.stringify(body)
      }
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          details: data.details,
        }
      }

      return data
    } catch (error) {
      console.error("API request failed:", error)
      return {
        success: false,
        error: "Network error or server unavailable",
      }
    }
  }

  // Authentication APIs
  async login(credentials: { username: string; password: string }) {
    return this.request("/auth/login", {
      method: "POST",
      body: credentials,
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
  }) {
    return this.request("/sewadars", { params })
  }

  async getSewadar(id: string) {
    return this.request(`/sewadars/${id}`)
  }

  async createSewadar(data: any) {
    return this.request("/sewadars", {
      method: "POST",
      body: data,
    })
  }

  async updateSewadar(id: string, data: any) {
    return this.request(`/sewadars/${id}`, {
      method: "PUT",
      body: data,
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

    return this.request("/sewadars/import", {
      method: "POST",
      body: formData,
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
    return this.request("/attendance", { params })
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

    return this.request("/attendance", {
      method: "POST",
      body: formData,
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
    page?: number
    limit?: number
  }) {
    return this.request("/events", { params })
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
      body: data,
    })
  }

  async updateEvent(id: string, data: any) {
    return this.request(`/events/${id}`, {
      method: "PUT",
      body: data,
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
    return this.request("/centers", { params })
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
      body: data,
    })
  }

  async updateCenter(id: string, data: { name: string }) {
    return this.request(`/centers/${id}`, {
      method: "PUT",
      body: data,
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
    return this.request("/coordinators", { params })
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
      body: data,
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
      body: data,
    })
  }

  async updateCoordinatorStatus(id: string, isActive: boolean) {
    return this.request(`/coordinators/${id}/status`, {
      method: "PUT",
      body: { isActive },
    })
  }

  async deleteCoordinator(id: string) {
    return this.request(`/coordinators/${id}`, {
      method: "DELETE",
    })
  }

  // Reports APIs
  async getAttendanceReport(params?: {
    fromDate?: string
    toDate?: string
    centerId?: string
    sewadarId?: string
    eventId?: string
    format?: "json" | "csv"
  }) {
    return this.request("/reports/attendance", { params })
  }

  // Dashboard APIs
  async getDashboardStats(days?: number) {
    return this.request("/dashboard/stats", {
      params: days ? { days: days.toString() } : undefined,
    })
  }
}

export const apiClient = new ApiClient()
