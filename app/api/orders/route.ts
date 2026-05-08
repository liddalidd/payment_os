import { db } from '@/lib/db/sqlite'
import { randomUUID } from 'node:crypto'

interface Order { id: string; customer_id: string | null }
interface OrderItem { id: string; order_id: string; product_id: string | null }

export async function GET() {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as Order[]

  const orderIds = orders.map((o) => o.id)
  const items = orderIds.length
    ? (db
        .prepare(`SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`)
        .all(...orderIds) as OrderItem[])
    : []

  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean) as string[])]
  const products = productIds.length
    ? db
        .prepare(`SELECT id, name, image_url FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`)
        .all(...productIds)
    : []
  const productMap = new Map(products.map((p: any) => [p.id, p]))

  const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean) as string[])]
  const customers = customerIds.length
    ? db
        .prepare(`SELECT id, name FROM customers WHERE id IN (${customerIds.map(() => '?').join(',')})`)
        .all(...customerIds)
    : []
  const customerMap = new Map(customers.map((c: any) => [c.id, c]))

  const itemsByOrder = new Map<string, any[]>()
  for (const it of items) {
    const list = itemsByOrder.get(it.order_id) ?? []
    list.push({ ...it, products: it.product_id ? productMap.get(it.product_id) ?? null : null })
    itemsByOrder.set(it.order_id, list)
  }

  const result = orders.map((o) => ({
    ...o,
    customers: o.customer_id ? customerMap.get(o.customer_id) ?? null : null,
    order_items: itemsByOrder.get(o.id) ?? [],
  }))

  return Response.json(result)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: 'EMPTY_CART', message: '购物车为空' }, { status: 400 })
  }

  try {
    const orderId = db.transaction(() => {
      const productIds = body.items.map((i: any) => i.product_id)
      const stockRows = db
        .prepare(
          `SELECT id, name, stock_quantity FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
        )
        .all(...productIds) as { id: string; name: string; stock_quantity: number }[]
      const stockMap = new Map(stockRows.map((r) => [r.id, r]))

      for (const it of body.items) {
        const p = stockMap.get(it.product_id)
        if (!p) throw new Error(`商品 ${it.product_id} 不存在`)
        if (Number(p.stock_quantity) < Number(it.quantity)) {
          throw new Error(`商品 "${p.name}" 库存不足 (剩余 ${p.stock_quantity}，需要 ${it.quantity})`)
        }
      }

      const id = randomUUID()
      db.prepare(
        `INSERT INTO orders
         (id, customer_id, type, status, total_amount, discount_amount, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        body.customer_id || null,
        body.type || 'retail',
        'completed',
        Number(body.total_amount),
        Number(body.discount_amount) || 0,
        body.payment_method || null,
      )

      const insertItem = db.prepare(
        `INSERT INTO order_items
         (id, order_id, product_id, quantity, price_at_sale, original_price, cost_at_sale)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      const updateStock = db.prepare(
        'UPDATE products SET stock_quantity = ROUND(stock_quantity - ?, 2) WHERE id = ?',
      )
      for (const it of body.items) {
        insertItem.run(
          randomUUID(),
          id,
          it.product_id,
          Number(it.quantity),
          Number(it.price_at_sale),
          it.original_price != null ? Number(it.original_price) : null,
          it.cost_at_sale != null ? Number(it.cost_at_sale) : 0,
        )
        updateStock.run(Number(it.quantity), it.product_id)
      }

      db.prepare(
        `INSERT INTO transactions (id, type, ledger_type, amount, category, note, related_id)
         VALUES (?, 'income', 'cash', ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        Number(body.total_amount),
        '零售销售',
        `订单 ${id.slice(0, 8)} 销售收入`,
        id,
      )

      return id
    })()

    return Response.json({ id: orderId }, { status: 201 })
  } catch (e: any) {
    return Response.json({ error: 'CHECKOUT_FAILED', message: e.message || '结算失败' }, { status: 400 })
  }
}
