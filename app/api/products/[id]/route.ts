import { db } from '@/lib/db/sqlite'

const ALLOWED = new Set([
  'name', 'barcode', 'sku', 'category', 'image_url', 'unit',
  'cost_price', 'retail_price', 'wholesale_price',
  'stock_quantity', 'min_stock_level',
])

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const fields = Object.keys(body).filter((k) => ALLOWED.has(k))
  if (fields.length === 0) return Response.json({ error: 'NO_FIELDS', message: '没有可更新字段' }, { status: 400 })

  const setClause = fields.map((f) => `${f} = ?`).join(', ')
  const values = fields.map((f) => body[f])
  db.prepare(`UPDATE products SET ${setClause} WHERE id = ?`).run(...values, id)
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  return Response.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inOrder = db.prepare('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1').get(id)
  const inPurchase = db.prepare('SELECT 1 FROM purchase_order_items WHERE product_id = ? LIMIT 1').get(id)
  if (inOrder || inPurchase) {
    return Response.json(
      { error: 'IN_USE', message: '该商品已有订单或采购记录，无法删除' },
      { status: 409 },
    )
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id)
  return Response.json({ ok: true })
}
