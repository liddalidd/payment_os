import { db } from '@/lib/db/sqlite'
import { randomUUID } from 'node:crypto'

interface PORow { id: string; supplier_id: string | null }
interface POItem { id: string; purchase_order_id: string; product_id: string | null }

export async function GET() {
  const orders = db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all() as PORow[]

  const ids = orders.map((o) => o.id)
  const items = ids.length
    ? (db
        .prepare(
          `SELECT * FROM purchase_order_items WHERE purchase_order_id IN (${ids.map(() => '?').join(',')})`,
        )
        .all(...ids) as POItem[])
    : []

  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean) as string[])]
  const products = productIds.length
    ? db
        .prepare(
          `SELECT id, name, image_url, unit FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
        )
        .all(...productIds)
    : []
  const productMap = new Map(products.map((p: any) => [p.id, p]))

  const supplierIds = [...new Set(orders.map((o) => o.supplier_id).filter(Boolean) as string[])]
  const suppliers = supplierIds.length
    ? db
        .prepare(`SELECT id, name FROM suppliers WHERE id IN (${supplierIds.map(() => '?').join(',')})`)
        .all(...supplierIds)
    : []
  const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]))

  const itemsByOrder = new Map<string, any[]>()
  for (const it of items) {
    const list = itemsByOrder.get(it.purchase_order_id) ?? []
    list.push({ ...it, products: it.product_id ? productMap.get(it.product_id) ?? null : null })
    itemsByOrder.set(it.purchase_order_id, list)
  }

  const result = orders.map((o) => ({
    ...o,
    suppliers: o.supplier_id ? supplierMap.get(o.supplier_id) ?? null : null,
    purchase_order_items: itemsByOrder.get(o.id) ?? [],
  }))

  return Response.json(result)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.supplier_id) return Response.json({ error: 'NO_SUPPLIER', message: '缺少供应商' }, { status: 400 })
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: 'EMPTY_ITEMS', message: '没有进货商品' }, { status: 400 })
  }

  try {
    const orderId = db.transaction(() => {
      // 1. Create new products for any isNew items, replacing productId in-place
      const insertProduct = db.prepare(
        `INSERT INTO products (id, name, barcode, unit, retail_price, stock_quantity, cost_price)
         VALUES (?, ?, ?, ?, ?, 0, 0)`,
      )
      const finalItems = body.items.map((it: any) => {
        if (it.isNew) {
          const newId = randomUUID()
          insertProduct.run(
            newId,
            it.name,
            it.barcode || null,
            it.unit || '件',
            Number(it.retailPrice) || 0,
          )
          return { ...it, productId: newId }
        }
        return it
      })

      // 2. Compute totals
      const totalGoodsValue = finalItems.reduce(
        (sum: number, it: any) => sum + Number(it.price) * Number(it.quantity),
        0,
      )
      const totalExtra = Number(body.shipping_fee || 0) + Number(body.other_costs || 0)

      // 3. Insert purchase order
      const id = randomUUID()
      db.prepare(
        `INSERT INTO purchase_orders
         (id, supplier_id, type, status, payment_status, total_cost, shipping_fee, other_costs)
         VALUES (?, ?, 'inbound', 'received', 'unpaid', ?, ?, ?)`,
      ).run(
        id,
        body.supplier_id,
        totalGoodsValue + totalExtra,
        Number(body.shipping_fee) || 0,
        Number(body.other_costs) || 0,
      )

      // 4. Insert items
      const insertItem = db.prepare(
        `INSERT INTO purchase_order_items
         (id, purchase_order_id, product_id, quantity, cost_price)
         VALUES (?, ?, ?, ?, ?)`,
      )
      const updateProduct = db.prepare(
        'UPDATE products SET stock_quantity = ?, cost_price = ? WHERE id = ?',
      )

      for (const it of finalItems) {
        insertItem.run(
          randomUUID(),
          id,
          it.productId,
          Number(it.quantity),
          Number(it.price),
        )

        // 5. Recompute weighted cost & update stock
        const totalNewStock = Number(it.originalStock || 0) + Number(it.quantity)
        const allocatedCost = Number(it.allocatedCost) || Number(it.price)
        const weightedCost =
          totalNewStock > 0
            ? (Number(it.originalStock || 0) * Number(it.originalCost || 0) +
                Number(it.quantity) * allocatedCost) /
              totalNewStock
            : allocatedCost
        updateProduct.run(
          Number(totalNewStock.toFixed(2)),
          Number(weightedCost.toFixed(2)),
          it.productId,
        )
      }

      return id
    })()

    return Response.json({ id: orderId }, { status: 201 })
  } catch (e: any) {
    return Response.json({ error: 'CREATE_FAILED', message: e.message || '入库失败' }, { status: 400 })
  }
}
