import { prisma } from '../prisma'
import { audit } from '../utils/audit'

export const ticketService = {
  async validateTicket(ticketId: string) {
    // 1. Fetch ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true }
    })

    if (!ticket) {
      throw new Error('ticket_not_found')
    }

    // 2. Check Status
    if (ticket.status === 'USED') {
      return { 
        success: false, 
        message: 'Ingresso já utilizado', 
        status: ticket.status, 
        usedAt: ticket.usedAt 
      }
    }
    
    if (ticket.status === 'INVALID' || ticket.status === 'CANCELED' || ticket.status === 'REFUNDED') {
      return { 
        success: false, 
        message: 'Ingresso inválido', 
        status: ticket.status 
      }
    }

    if (ticket.status === 'WAITING') {
      return { 
        success: false, 
        message: 'Ingresso aguardando pagamento ou confirmação', 
        status: ticket.status 
      }
    }

    // 3. Check Expiration
    // Use expiresAt if available, otherwise event.endDate
    const expiresAt = ticket.expiresAt ? new Date(ticket.expiresAt) : new Date(ticket.event.endDate)
    const now = new Date()

    if (now > expiresAt) {
      // Mark as invalid if not already
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'INVALID' }
      })
      return { 
        success: false, 
        message: 'Ingresso expirado', 
        status: 'INVALID' 
      }
    }

    // 4. Validate (Mark as USED)
    if (ticket.status === 'ACTIVE') {
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { 
          status: 'USED', 
          usedAt: now 
        }
      })
      
      audit('ticket_validated', { ticketId, usedAt: now })

      return { 
        success: true, 
        message: 'Ingresso validado com sucesso', 
        ticket: {
            id: updated.id,
            status: updated.status,
            usedAt: updated.usedAt,
            eventTitle: ticket.event.title,
            seat: ticket.ticketTypeId // placeholder if we had seat info
        }
      }
    }

    // Fallback
    return { 
        success: false, 
        message: `Estado do ingresso desconhecido: ${ticket.status}`, 
        status: ticket.status 
    }
  }
}
