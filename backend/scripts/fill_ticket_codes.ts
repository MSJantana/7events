import { prisma } from '../src/prisma'
import { randomUUID } from 'node:crypto'

async function main() {
  // This script is for maintenance. Since 'code' is required now, 
  // we check for empty strings or invalid data instead of null.
  const tickets = await prisma.ticket.findMany({
    where: {
      code: ''
    }
  })

  console.log(`Found ${tickets.length} tickets with empty code.`)

  for (const ticket of tickets) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { code: randomUUID() }
    })
  }

  console.log('Done.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
