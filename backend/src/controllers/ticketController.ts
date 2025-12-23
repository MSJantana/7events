import { Request, Response } from 'express'
import { ticketService } from '../services/ticketService'

export const ticketController = {
  async validate(req: Request, res: Response) {
    try {
      const { id } = req.params
      if (!id) {
        return res.status(400).json({ error: 'ticket_id_required' })
      }

      const result = await ticketService.validateTicket(id)
      
      if (result.success) {
        return res.json(result)
      } else {
        // Depending on requirements, we might return 400 or 200 with success: false.
        // Usually 200 is easier for client to handle "validity check" logic without throwing exceptions.
        // But if it's "not found", maybe 404.
        // I'll return 200 with the success flag as implemented in service.
        return res.json(result)
      }
    } catch (error: any) {
      if (error.message === 'ticket_not_found') {
        return res.status(404).json({ error: 'ticket_not_found' })
      }
      console.error(error)
      return res.status(500).json({ error: 'internal_server_error' })
    }
  }
}
