import { db } from '@/lib/db/sqlite'

const REFUND_STATUS = 'refunded_all'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const newStatus = String(body.status || '')
  if (!newStatus) {
    return Response.json({ error: 'NO_STATUS', message: '缺少状态值' }, { status: 400 })
  }

  try {
    db.transaction(() => {
      const current = db.prepare('SELECT status FROM orders WHERE id = ?').get(id) as
        | { status: string }
        | undefined
      if (!current) throw new Error('订单不存在')

      const wasReturned = current.status === REFUND_STATUS
      const willBeReturned = newStatus === REFUND_STATUS

      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, id)

      if (wasReturned !== willBeReturned) {
        const items = db
          .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
          .all(id) as { product_id: string | null; quantity: number }[]

        const updateStock = db.prepare(
          'UPDATE products SET stock_quantity = ROUND(stock_quantity + ?, 2) WHERE id = ?',
        )
        for (const it of items) {
          if (!it.product_id) continue
          // willBeReturned: + back to stock; reverting: - from stock
          const delta = willBeReturned ? Number(it.quantity) : -Number(it.quantity)
          updateStock.run(delta, it.product_id)
        }
      }
    })()

    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    return Response.json(row)
  } catch (e: any) {
    return Response.json({ error: 'UPDATE_FAILED', message: e.message || '更新失败' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  db.prepare('DELETE FROM orders WHERE id = ?').run(id)
  return Response.json({ ok: true })
}
