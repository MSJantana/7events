import { Router } from 'express'
import { checkinService } from '../services/checkinService'
import { z } from 'zod'
import { requireDeviceAuth, AuthDeviceRequest } from '../middlewares/deviceAuth'
import rateLimit from 'express-rate-limit'

const router = Router()

// Rate limiting: 10 requests per second per IP (or key if we wanted, but IP is standard for DDoS protection)
// For devices, we might want a stricter limit on INVALID attempts, but high throughput for valid ones.
// Let's set a reasonable limit.
const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 60, // 1 request per second average
	standardHeaders: 'draft-8',
	legacyHeaders: false,
    message: { success: false, message: 'Muitas requisições. Tente novamente em instantes.' }
})

const validateSchema = z.object({
  code: z.string().min(1, 'Código do ingresso é obrigatório')
})

// Apply Auth and Rate Limiting
router.post('/validate', limiter, requireDeviceAuth, async (req, res) => {
  try {
    const parseResult = validateSchema.safeParse(req.body)
    
    if (!parseResult.success) {
      res.status(400).json({ 
        success: false, 
        message: 'Dados inválidos.', 
        errors: z.treeifyError(parseResult.error)
      })
      return
    }

    const { code } = parseResult.data
    // Device is guaranteed to exist by requireDeviceAuth middleware
    const device = (req as AuthDeviceRequest).device!
    
    // We pass the full device object to service to avoid re-fetching
    const result = await checkinService.validateTicketWithDevice(code, device)
    
    res.json(result)

  } catch (error) {
    console.error('Checkin Error:', error)
    res.status(500).json({ success: false, message: 'Erro interno no servidor.' })
  }
})

export default router
