import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middlewares/auth'
import { orderController } from '../controllers/orderController'

const router = Router()

router.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.listMyOrders(req as any, res).catch((err) => next(err))
})
router.get('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.listAll(req as any, res).catch((err) => next(err))
})
router.post('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.create(req as any, res).catch((err) => next(err))
})
router.post('/bulk', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.createBulk(req as any, res).catch((err) => next(err))
})
router.post('/:id/pay', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.pay(req as any, res).catch((err) => next(err))
})
router.post('/:id/refund', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.refund(req as any, res).catch((err) => next(err))
})
router.post('/:id/cancel', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.cancel(req, res).catch((err) => next(err))
})
router.post('/:id/revert-cancel', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  orderController.revertCancel(req, res).catch((err) => next(err))
})

export default router
