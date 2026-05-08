import { db } from '@/lib/db/sqlite'

const ALLOWED = new Set([
  'name', 'phone', 'region', 'address', 'member_level',
  'points', 'total_spent', 'purchase_count', 'last_purchase_at',
])

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const fields = Object.keys(body).filter((k) => ALLOWED.has(k))
  if (fields.length === 0) return Response.json({ error: 'NO_FIELDS', message: '没有可更新字段' }, { status: 400 })

  const setClause = fields.map((f) => `${f} = ?`).join(', ')
  const values = fields.map((f) => body[f])
  try {
    db.prepare(`UPDATE customers SET ${setClause} WHERE id = ?`).run(...values, id)
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE constraint failed: customers.phone')) {
      return Response.json({ error: 'DUPLICATE_PHONE', message: '该手机号已存在' }, { status: 409 })
    }
    throw e
  }
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  return Response.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const used = db.prepare('SELECT 1 FROM orders WHERE customer_id = ? LIMIT 1').get(id)
  if (used) {
    return Response.json(
      { error: 'IN_USE', message: '该客户已有历史订单，无法删除' },
      { status: 409 },
    )
  }
  db.prepare('DELETE FROM customers WHERE id = ?').run(id)
  return Response.json({ ok: true })
}
