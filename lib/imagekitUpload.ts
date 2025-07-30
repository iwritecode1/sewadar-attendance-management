import ImageKit from 'imagekit'

// ImageKit configuration
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT

// Initialize ImageKit
function initializeImageKit() {
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error('ImageKit credentials not configured. Please check your environment variables.')
  }

  return new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  })
}

// Upload single file to ImageKit
export async function uploadToImageKit(
  file: File, 
  fileName: string,
  folder?: string
): Promise<string> {
  try {
    const imagekit = initializeImageKit()
    
    // Convert File to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const uniqueFileName = `${timestamp}_${fileName}`

    // Upload file to ImageKit
    const response = await imagekit.upload({
      file: buffer,
      fileName: uniqueFileName,
      folder: folder || '/nominal-rolls', // Default folder
      useUniqueFileName: true,
      tags: ['attendance', 'nominal-roll'],
    })

    // Return the ImageKit URL
    return response.url
  } catch (error) {
    console.error('ImageKit upload error:', error)
    throw new Error(`Failed to upload to ImageKit: ${error.message}`)
  }
}

// Upload multiple files to ImageKit
export async function uploadMultipleToImageKit(
  files: File[], 
  folder?: string
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const fileName = `${index + 1}_${file.name}`
    return uploadToImageKit(file, fileName, folder)
  })
  
  return Promise.all(uploadPromises)
}

// Delete file from ImageKit (optional utility)
export async function deleteFromImageKit(fileId: string): Promise<void> {
  try {
    const imagekit = initializeImageKit()
    await imagekit.deleteFile(fileId)
  } catch (error) {
    console.error('ImageKit delete error:', error)
    throw new Error(`Failed to delete from ImageKit: ${error.message}`)
  }
}

// Get optimized URL with transformations (optional utility)
export function getOptimizedImageUrl(
  url: string, 
  transformations?: {
    width?: number
    height?: number
    quality?: number
    format?: 'jpg' | 'png' | 'webp' | 'avif'
  }
): string {
  if (!transformations) return url

  const imagekit = initializeImageKit()
  
  const transformationParams: any = {}
  
  if (transformations.width) transformationParams.width = transformations.width
  if (transformations.height) transformationParams.height = transformations.height
  if (transformations.quality) transformationParams.quality = transformations.quality
  if (transformations.format) transformationParams.format = transformations.format

  return imagekit.url({
    src: url,
    transformation: [transformationParams]
  })
}