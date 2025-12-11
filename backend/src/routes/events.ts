import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { requireAuth, optionalAuth } from '../middlewares/auth'
import { eventController } from '../controllers/eventController'
import { env } from '../config/env'

const router = Router()

const dir = path.join(process.cwd(), 'uploads', 'events')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
const storage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, dir) },
  filename(_req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase()
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  }
})
function fileFilter(_req: any, file: Express.Multer.File, cb: (err: any, ok?: boolean) => void) {
  const ok = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)
  cb(ok ? null : new Error('invalid_mime'), ok)
}
const upload = multer({ storage, fileFilter, limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 } })

router.get('/', optionalAuth, eventController.list)
router.get('/slug/:slug', eventController.getBySlug)
router.get('/:id', eventController.get)
router.post('/', requireAuth, (req, res) => eventController.create(req as any, res))
router.patch('/:id', requireAuth, (req, res) => eventController.update(req as any, res))
router.post('/:id/publish', requireAuth, (req, res) => eventController.publish(req as any, res))
router.post('/:id/cancel', requireAuth, (req, res) => eventController.cancel(req as any, res))
router.post('/:id/image', requireAuth, (req, res) => {
  upload.single('image')(req as any, res as any, (err: any) => {
    if (err) {
      const e = err as { code?: string; message?: string }
      const code = e.code ?? e.message ?? 'upload_failed'
      const status = String(code).toUpperCase() === 'LIMIT_FILE_SIZE' ? 413 : 400
      return res.status(status).json({ error: 'upload_failed', details: String(code) })
    }
    return eventController.uploadImage(req as any, res)
  })
})

export default router
