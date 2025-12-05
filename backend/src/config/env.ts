import dotenv from 'dotenv'
dotenv.config()

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  JWT_SECRET: process.env.JWT_SECRET || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback',
  POST_LOGIN_REDIRECT_URL: process.env.POST_LOGIN_REDIRECT_URL || 'http://localhost:4000/auth/success',
  RESERVATION_TTL_MINUTES: Number(process.env.RESERVATION_TTL_MINUTES || 15),
  ACCESS_TOKEN_DAYS: Number(process.env.ACCESS_TOKEN_DAYS || 7),
  REFRESH_TOKEN_DAYS: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  SESSION_TTL_DAYS: Number(process.env.SESSION_TTL_DAYS || 30)
}
