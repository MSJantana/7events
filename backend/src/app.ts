import express, { Request, Response } from 'express'
import path from 'node:path'
import cors from 'cors'
import { env } from './config/env'
import authRouter from './routes/auth'
import eventsRouter from './routes/events'
import ticketTypesRouter from './routes/ticketTypes'
import ordersRouter from './routes/orders'
import debugRouter from './routes/debug'
import { requestLogger } from './middlewares/requestLogger'
import usersRouter from './routes/users'
import imagesRouter from './routes/images'
import ticketsRouter from './routes/tickets'
import checkinRouter from './routes/checkin'
import devicesRouter from './routes/devices'

const app = express()

app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true
}))
app.use(express.json())
app.use(requestLogger)

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', env: env.NODE_ENV })
})

app.get('/', (_req: Request, res: Response) => {
  res.json({
    app: '7Events API',
    status: 'online',
    docs: '/docs (not implemented yet)',
    health: '/health'
  })
})

app.use('/auth', authRouter)
app.use('/events', eventsRouter)
app.use('/events/:eventId/ticket-types', ticketTypesRouter)
app.use('/events/ticket-types', ticketTypesRouter)
app.use('/orders', ordersRouter)
app.use('/debug', debugRouter)
app.use('/users', usersRouter)
app.use('/images', imagesRouter)
app.use('/tickets', ticketsRouter)
app.use('/checkin', checkinRouter)
app.use('/devices', devicesRouter)

export default app
