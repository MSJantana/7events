import type { Role } from '@prisma/client'

declare global {
  interface JwtUser {
    sub: string
    role: Role
    sid?: string
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtUser
  }
}

export {}
