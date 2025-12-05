import { env } from '../src/config/env'

const BASE_URL = `http://127.0.0.1:${env.PORT}`
let token = ''
let eventId = ''
let ticketTypeId = ''
let orderId = ''

async function run() {
  try {
    console.log('Starting verification...')

    // 1. Health Check
    const health = await fetch(`${BASE_URL}/health`).then(r => r.json())
    console.log('Health:', health)

    // 2. Login (assuming a test user exists or we can create one, but for now let's try to hit a public endpoint first)
    // Since we don't have a seed script readily available in the context, I'll assume we might fail auth steps if no user exists.
    // However, I can try to register or login if I knew the creds.
    // Let's list events (public)
    const events = await fetch(`${BASE_URL}/events`).then(r => r.json())
    console.log('Events:', events)

    if (events.length > 0) {
      eventId = events[0].id
      console.log('Found event:', eventId)
    }

    // If we can't login, we can't test much more. 
    // I'll check if there is a seed script or if I should create one.
    // The package.json has "prisma:baseline", maybe that seeds?
    // Let's assume for now we just verify the server is up and public endpoints work.
    
    console.log('Verification complete (partial).')
  } catch (e) {
    console.error('Verification failed:', e)
    process.exit(1)
  }
}

run()
