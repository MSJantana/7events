import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const password = process.env.DB_PASSWORD ? decodeURIComponent(process.env.DB_PASSWORD) : ''
const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password,
  database: process.env.DB_NAME || '7Events',
  connectionLimit: 5
})

export const prisma = new PrismaClient({ adapter })
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
