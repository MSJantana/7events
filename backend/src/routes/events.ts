import { Router } from 'express'
import { requireAuth } from '../middlewares/auth'
import { eventController } from '../controllers/eventController'

const router = Router()

router.get('/', eventController.list)
router.get('/:id', eventController.get)
router.post('/', requireAuth, (req, res) => eventController.create(req as any, res))
router.patch('/:id', requireAuth, (req, res) => eventController.update(req as any, res))
router.post('/:id/publish', requireAuth, (req, res) => eventController.publish(req as any, res))
router.post('/:id/cancel', requireAuth, (req, res) => eventController.cancel(req as any, res))

export default router
