import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

export async function middleware(request: NextRequest, response: NextResponse) {
  // Skip middleware for API routes, static files, and public paths
  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/manifest.json") ||
    request.nextUrl.pathname.startsWith("/sw.js") ||
    request.nextUrl.pathname.startsWith("/icon-")
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("token")?.value
  const isLoginPage = request.nextUrl.pathname === "/"

  // If no token and not on login page, redirect to login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // If has token and on login page, redirect to appropriate dashboard
  if (token && isLoginPage) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret")
      const { payload } = await jwtVerify(token, secret)

      if (payload.role === "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      } else {
        return NextResponse.redirect(new URL("/attendance", request.url))
      }
    } catch (error) {
      // Invalid token, continue to login page
      const response = NextResponse.next()
      response.cookies.delete("token")
      return response
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
