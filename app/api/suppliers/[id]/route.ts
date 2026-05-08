import { db } from '@/lib/db/sqlite'

const ALLOWED = new Set(['name', 'contact_person', 'phone', 'email', 'address'])

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const fields = Object.keys(body).filter((k) => ALLOWED.has(k))
  if (fields.length === 0) return Response.json({ error: 'NO_FIELDS', message: '没有可更新字段' }, { status: 400 })

  const setClause = fields.map((f) => `${f} = ?`).join(', ')
  const values = fields.map((f) => body[f])
  db.prepare(`UPDATE suppliers SET ${setClause} WHERE id = ?`).run(...values, id)
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
  return Response.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const used = db.prepare('SELECT 1 FROM purchase_orders WHERE supplier_id = ? LIMIT 1').get(id)
  if (used) {
    return Response.json(
      { error: 'IN_USE', message: '该供应商已有进货记录，无法删除' },
      { status: 409 },
    )
  }
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
  return Response.json({ ok: true })
}
