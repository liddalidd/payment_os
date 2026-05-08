import type Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'db', 'schema.sqlite.sql')
const SCHEMA_VERSION = 1

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)

  const row = db.prepare('SELECT version FROM __migrations WHERE version = ?').get(SCHEMA_VERSION)
  if (row) return

  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8')
  db.transaction(() => {
    db.exec(sql)
    db.prepare('INSERT INTO __migrations (version) VALUES (?)').run(SCHEMA_VERSION)
  })()
}
