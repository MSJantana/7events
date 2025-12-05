export function log(level: 'info' | 'warn' | 'error', msg: string, data?: any) {
  const ts = new Date().toISOString()
  const base: any = { ts, level, msg }
  if (data && typeof data === 'object') {
    const { error, ...rest } = data
    if (Object.keys(rest).length) base.ctx = rest
    if (error) {
      const e: any = error
      base.err = {
        name: e?.name,
        message: e?.message,
        stack: typeof e?.stack === 'string' ? String(e.stack).split('\n').slice(0, 3).join(' | ') : undefined,
        response: e?.response?.data
      }
    }
  }
  const line = JSON.stringify(base)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logInfo = (msg: string, data?: any) => log('info', msg, data)
export const logWarn = (msg: string, data?: any) => log('warn', msg, data)
export const logError = (msg: string, data?: any) => log('error', msg, data)
