import { db } from '@/lib/db/sqlite'
import { randomUUID } from 'node:crypto'

export async function GET() {
  const rows = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all()
  return Response.json(rows)
}

export async function POST(req: Request) {
  const body = await req.json()
  const id = randomUUID()
  try {
    db.prepare(
      `INSERT INTO customers (id, name, phone, region, address, member_level, points)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      body.name || null,
      body.phone || null,
      body.region || null,
      body.address || null,
      body.member_level || 'bronze',
      Number(body.points) || 0,
    )
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE constraint failed: customers.phone')) {
      return Response.json({ error: 'DUPLICATE_PHONE', message: '该手机号已存在' }, { status: 409 })
    }
    throw e
  }
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  return Response.json(row, { status: 201 })
}
