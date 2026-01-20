import { supabase } from './supabase'

export interface UploadResult {
  path: string
  url: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

const MAX_FILE_SIZE = 52428800 // 50MB
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v']

export async function uploadVideo(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file size (50MB)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 50MB for free users.')
  }

  // Validate file type
  if (!file.type.startsWith('video/')) {
    throw new Error('Please upload a video file.')
  }

  // Create unique filename with validated extension
  const fileExt = file.name.split('.').pop()?.toLowerCase()

  if (!fileExt || !ALLOWED_VIDEO_EXTENSIONS.includes(fileExt)) {
    throw new Error(`Invalid video format. Allowed formats: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`)
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  // Upload to FreeBucket
  const { data, error } = await supabase.storage
    .from('FreeBucket')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  
  // Get public URL (if bucket is public)
  const { data: urlData } = supabase.storage
    .from('FreeBucket')
    .getPublicUrl(filePath)

  return {
    path: data.path,
    url: urlData.publicUrl
  }
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('video/')) {
    return { valid: false, error: 'Please upload a video file.' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 50MB.' }
  }
  
  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}