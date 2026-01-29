import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { env } from '../../config/env'

export type ProcessResult = { mainName: string; thumbName: string }

function isValidSignature(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(12)
    fs.readSync(fd, buf, 0, 12, 0)
    fs.closeSync(fd)
    const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8
    const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP'
    return isPng || isJpeg || isWebp
  } catch {
    return false
  }
}

export async function processEventImage(tmpPath: string, uploadDir: string): Promise<ProcessResult> {
  const okSig = isValidSignature(tmpPath)
  if (!okSig) throw new Error('invalid_signature')

  const meta = await sharp(tmpPath).metadata()
  const minW = 600, minH = 400
  if (!meta.width || !meta.height) throw new Error('invalid_image')
  if (meta.width < minW || meta.height < minH) throw new Error('low_resolution')

  const baseName = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const mainName = `${baseName}.webp`
  const thumbName = `${baseName}-thumb.webp`
  const mainPath = path.join(uploadDir, mainName)
  const thumbPath = path.join(uploadDir, thumbName)

  await sharp(tmpPath)
    .resize({ width: env.IMAGE_MAIN_MAX_W, withoutEnlargement: true })
    .webp({ quality: env.IMAGE_WEBP_QUALITY })
    .toFile(mainPath)

  await sharp(tmpPath)
    .resize({ width: env.IMAGE_THUMB_W, height: env.IMAGE_THUMB_H, fit: 'cover' })
    .webp({ quality: env.IMAGE_WEBP_QUALITY })
    .toFile(thumbPath)

  return { mainName, thumbName }
}

export function removePreviousUnderUploads(baseUrl: string, currentUrl?: string) {
  try {
    const prev = currentUrl || ''
    const prefix = `${baseUrl}/uploads/events/`
    const relativePrefix = `/uploads/events/`
    
    let prevFile = ''
    if (prev.startsWith(prefix)) {
      prevFile = prev.substring(prefix.length)
    } else if (prev.startsWith(relativePrefix)) {
      prevFile = prev.substring(relativePrefix.length)
    }

    if (prevFile) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'events')
      const prevMain = path.join(uploadDir, prevFile)
      const prevThumb = prevFile.endsWith('.webp') ? path.join(uploadDir, prevFile.replace(/\.webp$/, '-thumb.webp')) : ''
      if (fs.existsSync(prevMain)) fs.unlinkSync(prevMain)
      if (prevThumb && fs.existsSync(prevThumb)) fs.unlinkSync(prevThumb)
    }
  } catch {}
}
