import { writeFile, unlink, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const UPLOAD_DIR = path.join(process.cwd(), "uploads")
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"]

// Ensure upload directory exists
async function ensureUploadDir(subDir?: string) {
  const targetDir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR

  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true })
  }

  return targetDir
}

// Validate file
function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  return { isValid: true }
}

// Upload single file
export async function uploadFile(file: File, subDir?: string): Promise<string> {
  const validation = validateFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  const uploadDir = await ensureUploadDir(subDir)
  const fileExtension = path.extname(file.name)
  const fileName = `${uuidv4()}${fileExtension}`
  const filePath = path.join(uploadDir, fileName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  // Return relative path for storage in database
  const relativePath = subDir ? `${subDir}/${fileName}` : fileName
  return relativePath
}

// Upload multiple files
export async function uploadFiles(files: File[], subDir?: string): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadFile(file, subDir))
  return Promise.all(uploadPromises)
}

// Delete file
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath)
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error)
    // Don't throw error to prevent cascading failures
  }
}

// Delete multiple files
export async function deleteFiles(filePaths: string[]): Promise<void> {
  const deletePromises = filePaths.map((filePath) => deleteFile(filePath))
  await Promise.allSettled(deletePromises)
}

// Get file URL for serving
export function getFileUrl(filePath: string): string {
  return `/api/files/${filePath}`
}

// Serve file (for API route)
export async function serveFile(filePath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath)

    if (!existsSync(fullPath)) {
      return null
    }

    const { readFile } = await import("fs/promises")
    const buffer = await readFile(fullPath)

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase()
    let contentType = "application/octet-stream"

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg"
        break
      case ".png":
        contentType = "image/png"
        break
    }

    return { buffer, contentType }
  } catch (error) {
    console.error(`Failed to serve file ${filePath}:`, error)
    return null
  }
}
