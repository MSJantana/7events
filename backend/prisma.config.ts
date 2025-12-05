import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

const url = `mysql://${env('DB_USER')}:${env('DB_PASSWORD')}@${env('DB_HOST')}:${env('DB_PORT')}/${env('DB_NAME')}`

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url
  }
})
