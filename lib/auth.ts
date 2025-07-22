import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import User from "@/models/User"
import dbConnect from "./mongodb"

export interface UserSession {
  id: string
  name: string
  username: string
  role: "admin" | "coordinator"
  area: string
  areaCode: string
  centerId?: string
  centerName?: string
  createdAt?: string
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value

    if (!token) return null

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret")
    const { payload } = await jwtVerify(token, secret)
    return payload as UserSession
  } catch (error) {
    return null
  }
}

export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; user?: UserSession; response?: NextResponse }> {
  await dbConnect()

  const user = await User.findOne({ username, isActive: true })

  if (!user) {
    return { success: false }
  }

  const isPasswordValid = await user.comparePassword(password)

  if (!isPasswordValid) {
    return { success: false }
  }

  const session: UserSession = {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    role: user.role,
    area: user.area,
    areaCode: user.areaCode,
    centerId: user.centerId,
    centerName: user.centerName,
    createdAt: user.createdAt?.toISOString(),
  }

  const token = await createToken(session)

  // Create response with cookie
  const response = NextResponse.json({ success: true, user: session })

  response.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: "lax",
  })

  return { success: true, user: session, response }
}

export async function logout() {
  const response = NextResponse.json({ success: true })

  response.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  })

  return response
}

async function createToken(payload: UserSession): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret")

  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret)
}

export function isAuthorized(
  user: UserSession | null,
  requiredRole?: "admin" | "coordinator",
  requiredCenterId?: string,
): boolean {
  if (!user) return false

  // Role check
  if (requiredRole && user.role !== requiredRole) {
    // Exception: admin can do anything a coordinator can
    if (!(requiredRole === "coordinator" && user.role === "admin")) {
      return false
    }
  }

  // Center check for coordinators
  if (requiredCenterId && user.role === "coordinator" && user.centerId !== requiredCenterId) {
    return false
  }

  return true
}
