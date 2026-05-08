import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { runMigrations } from './migrate'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'payment.db')

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined
}

function open(): Database.Database {
  fs.mkdirSync(DB_DIR, { recursive: true })
  const handle = new Database(DB_PATH)
  handle.pragma('journal_mode = WAL')
  handle.pragma('foreign_keys = ON')
  handle.pragma('busy_timeout = 5000')
  runMigrations(handle)
  return handle
}

function getRealDb(): Database.Database {
  if (!globalThis.__db) globalThis.__db = open()
  return globalThis.__db
}

// Lazy proxy so DB is opened on first use, not at module import time.
// Avoids `SQLITE_BUSY` during Next.js' parallel page-data collection.
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const real = getRealDb()
    const value = (real as any)[prop]
    return typeof value === 'function' ? value.bind(real) : value
  },
})
