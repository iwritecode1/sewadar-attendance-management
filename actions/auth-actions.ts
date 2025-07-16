"use server"

import { login, logout } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  if (!username || !password) {
    return { success: false, error: "Username and password are required" }
  }

  const result = await login(username, password)

  if (result.success && result.user) {
    revalidatePath("/")
    return { success: true, user: result.user }
  }

  return { success: false, error: "Invalid username or password" }
}

// export async function logoutAction() {
//   await logout()
//   revalidatePath("/")
//   redirect("/")
// }
