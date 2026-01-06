import { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma'

export interface AuthDeviceRequest extends Request {
  device?: {
    id: string
    name: string
    apiKey: string
    eventId: string | null
    enabled: boolean
  }
}

export async function requireDeviceAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || extractBearerToken(req.headers['authorization'])

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ success: false, message: 'API Key não fornecida.' })
    return
  }

  try {
    const device = await prisma.checkinDevice.findUnique({
      where: { apiKey }
    })

    if (!device) {
      res.status(401).json({ success: false, message: 'API Key inválida.' })
      return
    }

    if (!device.enabled) {
      res.status(403).json({ success: false, message: 'Dispositivo inativo.' })
      return
    }

    // Attach device to request
    (req as AuthDeviceRequest).device = device
    next()
  } catch (error) {
    console.error('Device Auth Error:', error)
    res.status(500).json({ success: false, message: 'Erro interno na autenticação do dispositivo.' })
  }
}

function extractBearerToken(authHeader?: string): string | undefined {
  if (!authHeader) return undefined
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return undefined
}
