import express, { Request, Response } from 'express'
import cors from 'cors'
import { env } from './config/env'
import authRouter from './routes/auth'
import eventsRouter from './routes/events'
import ticketTypesRouter from './routes/ticketTypes'
import ordersRouter from './routes/orders'
import debugRouter from './routes/debug'
import { requestLogger } from './middlewares/requestLogger'
import usersRouter from './routes/users'

const app = express()

app.use(cors())
app.use(express.json())
app.use(requestLogger)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', env: env.NODE_ENV })
})

app.use('/auth', authRouter)
app.use('/events', eventsRouter)
app.use('/events/:eventId/ticket-types', ticketTypesRouter)
app.use('/events/ticket-types', ticketTypesRouter)
app.use('/orders', ordersRouter)
app.use('/debug', debugRouter)
app.use('/users', usersRouter)

export default app
