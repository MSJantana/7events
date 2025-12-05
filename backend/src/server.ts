import app from './app'
import { env } from './config/env'
import { startReservationExpiryJob } from './jobs/expiration'

const port = env.PORT

app.listen(port, () => {
  console.log(`🚀Server is running on port ${port}`)
  // no console noise beyond essentials
})

// Start background jobs
startReservationExpiryJob()