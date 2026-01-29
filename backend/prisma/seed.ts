import { prisma } from '../src/prisma'
import { Role } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'
import process from 'node:process'

async function main() {
  const email = 'marcio.santana@adventistas.org'
  const name = 'Márcio Santana'
  const password = 'Zurimb@2015'
  const role = Role.ADMIN

  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 32).toString('hex')
  const passwordHash = `${salt}:${hash}`

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      passwordHash
    },
    create: {
      email,
      name,
      role,
      passwordHash
    }
  })

  console.log('Admin user seeded:', user)
}

void (async () => {
  try {
    await main()
  } catch (e) {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
