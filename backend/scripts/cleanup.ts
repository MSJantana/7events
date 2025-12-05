import { prisma } from '../src/prisma'
/// <reference types="node" />

(async () => {
  try {
    const res: any = {}
    res.payment = await prisma.payment.deleteMany({})
    res.ticket = await prisma.ticket.deleteMany({})
    res.ticketType = await prisma.ticketType.deleteMany({})
    res.order = await prisma.order.deleteMany({})
    res.event = await prisma.event.deleteMany({})
    res.loginSession = await prisma.loginSession.deleteMany({})
    res.user = await prisma.user.deleteMany({})
    console.log(JSON.stringify({ ok: true, deleted: res }))
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, error: e?.message }))
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
