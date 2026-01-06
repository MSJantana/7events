import { prisma } from '../src/prisma'
import { randomBytes } from 'node:crypto'

async function main() {
  const args = process.argv.slice(2)
  const name = args[0]
  const eventId = args[1] // Optional

  if (!name) {
    console.error('Usage: npx ts-node scripts/create_device.ts <name> [eventId]')
    process.exit(1)
  }

  const apiKey = 'dev_' + randomBytes(12).toString('hex')

  const device = await prisma.checkinDevice.create({
    data: {
      name,
      apiKey,
      eventId: eventId || null,
      enabled: true
    }
  })

  console.log('✅ Device created successfully!')
  console.log('------------------------------------------------')
  console.log(`ID:       ${device.id}`)
  console.log(`Name:     ${device.name}`)
  console.log(`API Key:  ${device.apiKey}`)
  console.log(`Event ID: ${device.eventId || '(Global)'}`)
  console.log('------------------------------------------------')
  console.log('Use this API Key in your check-in app.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
