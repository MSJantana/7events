require('dotenv').config()
const { spawnSync } = require('node:child_process')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', env: process.env, shell: true, ...opts })
  if (res.status !== 0) {
    const msgErr = (res.stderr && res.stderr.toString()) || ''
    const msgOut = (res.stdout && res.stdout.toString()) || ''
    const msg = (msgErr + '\n' + msgOut).trim() || 'unknown error'
    throw new Error(msg)
  }
  return res.stdout ? res.stdout.toString() : ''
}

function timestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

function main() {
  process.stdout.write(`Using Prisma config datasource\n`)
  const name = `${timestamp()}_baseline`
  const dir = join(process.cwd(), 'prisma', 'migrations', name)
  mkdirSync(dir, { recursive: true })

  const sql = run('npx', [
    'prisma',
    'migrate',
    'diff',
    '--from-config-datasource',
    '--to-schema',
    'prisma/schema.prisma',
    '--script'
  ])

  writeFileSync(join(dir, 'migration.sql'), sql || '')

  run('npx', ['prisma', 'migrate', 'resolve', '--applied', name])

  process.stdout.write(`Baseline created: ${name}\n`)
}

try {
  main()
} catch (e) {
  process.stderr.write(String(e.message || e))
  process.exit(1)
}
