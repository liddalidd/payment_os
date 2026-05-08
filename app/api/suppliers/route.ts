import { db } from '@/lib/db/sqlite'
import { randomUUID } from 'node:crypto'

export async function GET() {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all()
  return Response.json(rows)
}

export async function POST(req: Request) {
  const body = await req.json()
  const id = randomUUID()
  db.prepare(
    `INSERT INTO suppliers (id, name, contact_person, phone, email, address)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.contact_person || null,
    body.phone || null,
    body.email || null,
    body.address || null,
  )
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
  return Response.json(row, { status: 201 })
}
