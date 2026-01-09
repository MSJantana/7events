import { prisma } from '../prisma'
import { TicketStatus } from '@prisma/client'

export type ValidationResult = {
  success: boolean
  message: string
  ticket?: {
    id: string
    code: string
    status: TicketStatus
    attendeeName: string
    ticketType: string
    eventName: string
    usedAt?: Date | null
  }
}

export const checkinService = {
  async validateTicketWithDevice(code: string, device: any): Promise<ValidationResult> {
    // 2. Find Ticket
    const ticket = await prisma.ticket.findUnique({
      where: { code },
      include: {
        event: true,
        user: true,
        ticketType: true
      }
    })

    if (!ticket) {
      // Log attempt if possible, but without ticketId we can't link to ticket.
      return { success: false, message: 'Ingresso não encontrado.' }
    }

    // 3. Check Event Scope (only if device is bound to an event)
    if (device?.eventId && device.eventId !== ticket.eventId) {
      await prisma.ticketValidationLog.create({
        data: {
          ticketId: ticket.id,
          deviceId: device.id,
          status: 'FAIL',
          message: 'Ingresso de outro evento'
        }
      })
      return { success: false, message: 'Ingresso não pertence a este evento.' }
    }

    // 4. Check Status
    if (ticket.status === TicketStatus.USED) {
      await prisma.ticketValidationLog.create({
        data: {
          ticketId: ticket.id,
          deviceId: device?.id,
          status: 'ALREADY_USED',
          message: 'Ingresso já utilizado'
        }
      })
      return {
        success: false,
        message: 'Ingresso já utilizado.',
        ticket: {
          id: ticket.id,
          code: ticket.code,
          status: ticket.status,
          attendeeName: ticket.user?.name || 'Desconhecido',
          ticketType: ticket.ticketType.name,
          eventName: ticket.event.title,
          usedAt: ticket.usedAt
        }
      }
    }

    if (ticket.status !== TicketStatus.ACTIVE) {
       await prisma.ticketValidationLog.create({
        data: {
          ticketId: ticket.id,
          deviceId: device?.id,
          status: 'FAIL',
          message: `Status inválido: ${ticket.status}`
        }
      })
      return { success: false, message: `Ingresso inválido (Status: ${ticket.status}).` }
    }

    // 5. Success - Mark as Used (Transaction)
    return await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.USED,
          usedAt: new Date()
        }
      })
  
      await tx.ticketValidationLog.create({
        data: {
          ticketId: ticket.id,
          deviceId: device?.id,
          status: 'SUCCESS',
          message: 'Check-in realizado com sucesso'
        }
      })
  
      return {
        success: true,
        message: 'Acesso liberado!',
        ticket: {
          id: updatedTicket.id,
          code: updatedTicket.code,
          status: updatedTicket.status,
          attendeeName: ticket.user?.name || 'Desconhecido',
          ticketType: ticket.ticketType.name,
          eventName: ticket.event.title,
          usedAt: updatedTicket.usedAt
        }
      }
    })
  },

  async validateTicket(code: string, deviceApiKey?: string): Promise<ValidationResult> {
    // 1. Validate Device (if provided)
    let device = null
    if (deviceApiKey) {
      device = await prisma.checkinDevice.findUnique({
        where: { apiKey: deviceApiKey },
        include: { event: true }
      })

      if (!device || !device.enabled) {
        return { success: false, message: 'Dispositivo não autorizado ou inativo.' }
      }
    }

    // Call the internal logic with the resolved device (or null)
    return this.validateTicketWithDevice(code, device)
  }
}
