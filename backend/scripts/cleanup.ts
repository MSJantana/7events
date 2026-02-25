import { prisma } from '../src/prisma'
/// <reference types="node" />

// Top-level await is not supported in CommonJS modules.
// We must use an async IIFE here.
(async () => {
  try {
    const env = String(process.env.NODE_ENV || 'development')
    const allow = String(process.env.ALLOW_CLEANUP || '') === '1'
    if (env !== 'development' && !allow) {
      console.error(JSON.stringify({ ok: false, error: 'forbidden_env', message: 'Set ALLOW_CLEANUP=1 to run outside development' }))
      process.exit(1)
    }
    const startedAt = new Date().toISOString()
    const res: any = {}
    res.payment = await prisma.payment.deleteMany({})
    res.ticket = await prisma.ticket.deleteMany({})
    res.ticketType = await prisma.ticketType.deleteMany({})
    res.order = await prisma.order.deleteMany({})
    res.event = await prisma.event.deleteMany({})
    res.loginSession = await prisma.loginSession.deleteMany({})
    res.user = await prisma.user.deleteMany({})
    console.log(JSON.stringify({ ok: true, startedAt, finishedAt: new Date().toISOString(), deleted: res }))
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, error: e?.message }))
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
