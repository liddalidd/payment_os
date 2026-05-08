import { db } from '@/lib/db/sqlite'
import { randomUUID } from 'node:crypto'

export async function GET() {
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
  return Response.json(rows)
}

export async function POST(req: Request) {
  const body = await req.json()
  const id = randomUUID()
  db.prepare(
    `INSERT INTO products
     (id, name, barcode, sku, category, image_url, unit,
      cost_price, retail_price, wholesale_price,
      stock_quantity, min_stock_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.barcode || null,
    body.sku || null,
    body.category || null,
    body.image_url || null,
    body.unit || '件',
    Number(body.cost_price) || 0,
    Number(body.retail_price) || 0,
    Number(body.wholesale_price) || 0,
    Number(body.stock_quantity) || 0,
    body.min_stock_level != null ? Number(body.min_stock_level) : 5,
  )
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  return Response.json(row, { status: 201 })
}
