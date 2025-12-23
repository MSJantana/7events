import { Router } from 'express'
import { ticketController } from '../controllers/ticketController'
import { requireAuth } from '../middlewares/auth'

const router = Router()

// Validate ticket endpoint
// Protected by requireAuth. 
// In a real scenario, might need check if user is organizer of the event.
// For now, any authenticated user (e.g. staff) can validate.
router.post('/:id/validate', requireAuth, ticketController.validate)

export default router
