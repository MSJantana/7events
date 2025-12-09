import { Router, Request, Response } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import sharp from 'sharp'
import { env } from '../config/env'

const router = Router()

router.get('/config', async (_req: Request, res: Response) => {
  try {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    return res.json({
      uploadMaxMB: env.UPLOAD_MAX_MB,
      allowedMimes,
      minWidth: 600,
      minHeight: 400,
      mainMaxWidth: env.IMAGE_MAIN_MAX_W
    })
  } catch {
    return res.status(500).json({ error: 'config_failed' })
  }
})

router.get('/:file', async (req: Request, res: Response) => {
  try {
    const { file } = req.params as { file: string }
    const w = Number(req.query.w || 0)
    const src = path.join(process.cwd(), 'uploads', 'events', file)
    if (!fs.existsSync(src)) return res.status(404).json({ error: 'not_found' })
    if (!w || w <= 0 || w > env.IMAGE_MAIN_MAX_W) return res.sendFile(src)

    const cacheDir = path.join(process.cwd(), 'uploads', 'cache')
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
    const targetName = `${path.basename(file, path.extname(file))}-w${w}.webp`
    const target = path.join(cacheDir, targetName)
    if (!fs.existsSync(target)) {
      await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: env.IMAGE_WEBP_QUALITY }).toFile(target)
    }
    return res.sendFile(target)
  } catch (e: any) {
    return res.status(500).json({ error: 'transform_failed', details: e?.message })
  }
})

export default router
