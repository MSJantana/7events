import { prisma } from '../src/prisma'

(async () => {
  try {
    const col: Array<{ COLUMN_NAME: string }> = await prisma.$queryRawUnsafe(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'auth0Id'"
    )
    if (!col?.length) {
      console.log(JSON.stringify({ ok: true, message: 'auth0Id column not found' }))
      return
    }
    const rows: Array<{ id: string; email: string; name: string; auth0Id: string | null }> = await prisma.$queryRawUnsafe(
      "SELECT id, email, name, auth0Id FROM User WHERE auth0Id IS NOT NULL AND auth0Id <> ''"
    )
    for (const r of rows) {
      await prisma.userGoogle.upsert({
        where: { sub: String(r.auth0Id) },
        update: { email: r.email, name: r.name },
        create: { sub: String(r.auth0Id), email: r.email, name: r.name, userId: r.id }
      })
    }
    console.log(JSON.stringify({ ok: true, migrated: rows.length }))
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, error: e?.message }))
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()

