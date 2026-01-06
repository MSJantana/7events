import { prisma } from '../src/prisma'
import { checkinService } from '../src/services/checkinService'
import { randomUUID } from 'node:crypto'

async function main() {
  try {
    console.log('🚀 Starting Check-in Test Script (No Auth Mode)')

    // 1. Prepare Test Data (Event + Ticket)
    const event = await prisma.event.findFirst({
      include: { ticketTypes: true }
    })

    if (!event) {
      console.error('❌ No events found. Please create an event first.')
      return
    }

    const ticketType = event.ticketTypes[0]
    if (!ticketType) {
      console.error('❌ No ticket types found.')
      return
    }

    // Create tickets for different scenarios
    const validTicketCode = randomUUID()
    const validTicket = await prisma.ticket.create({
      data: { eventId: event.id, ticketTypeId: ticketType.id, code: validTicketCode, status: 'ACTIVE' }
    })
    console.log(`✅ Valid Ticket created: ${validTicket.code}`)

    const canceledTicketCode = randomUUID()
    const canceledTicket = await prisma.ticket.create({
      data: { eventId: event.id, ticketTypeId: ticketType.id, code: canceledTicketCode, status: 'CANCELED' }
    })
    console.log(`✅ Canceled Ticket created: ${canceledTicket.code}`)

    try {
      // --- Scenario 1: Valid Ticket ---
      console.log('\n--- 1. Valid Ticket (Should Success) ---')
      // Note: No apiKey passed
      const res1 = await checkinService.validateTicket(validTicket.code)
      console.log('Result:', JSON.stringify(res1, null, 2))
      if (!res1.success) throw new Error('Scenario 1 failed')
      if (res1.ticket?.status !== 'USED') throw new Error('Ticket status not updated to USED')

      // --- Scenario 2: Already Used (same ticket) ---
      console.log('\n--- 2. Used Ticket (Should Fail) ---')
      const res2 = await checkinService.validateTicket(validTicket.code)
      console.log('Result:', JSON.stringify(res2, null, 2))
      if (res2.success) throw new Error('Scenario 2 succeeded but should fail')

      // --- Scenario 3: Canceled Ticket ---
      console.log('\n--- 3. Canceled Ticket (Should Fail) ---')
      const res3 = await checkinService.validateTicket(canceledTicket.code)
      console.log('Result:', JSON.stringify(res3, null, 2))
      if (res3.success) throw new Error('Scenario 3 succeeded but should fail')

      // --- Scenario 4: Non-existent Code ---
      console.log('\n--- 4. Non-existent Code (Should Fail) ---')
      const res4 = await checkinService.validateTicket('non-existent-code-xyz')
      console.log('Result:', JSON.stringify(res4, null, 2))
      if (res4.success) throw new Error('Scenario 4 succeeded but should fail')

      console.log('\n✨ All tests passed successfully!')

    } catch (e) {
      console.error('\n❌ Test failed:', e)
    } finally {
      // Cleanup
      console.log('\n🧹 Cleaning up...')
      await prisma.ticket.delete({ where: { id: validTicket.id } })
      await prisma.ticket.delete({ where: { id: canceledTicket.id } })
    }

  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

void main()
