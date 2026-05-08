import { db } from '@/lib/db/sqlite'
import { randomUUID } from 'node:crypto'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const newType = body.type === 'outbound' ? 'outbound' : 'inbound'
  const newPaymentStatus = body.payment_status === 'paid' ? 'paid' : 'unpaid'

  try {
    db.transaction(() => {
      const current = db
        .prepare(
          'SELECT type, payment_status, total_cost, shipping_fee, other_costs FROM purchase_orders WHERE id = ?',
        )
        .get(id) as
        | {
            type: string
            payment_status: string
            total_cost: number
            shipping_fee: number | null
            other_costs: number | null
          }
        | undefined
      if (!current) throw new Error('进货单不存在')

      const oldType = current.type || 'inbound'
      const oldPaymentStatus = current.payment_status || 'unpaid'
      if (oldType === newType && oldPaymentStatus === newPaymentStatus) return

      db.prepare('UPDATE purchase_orders SET type = ?, payment_status = ? WHERE id = ?').run(
        newType,
        newPaymentStatus,
        id,
      )

      // Stock sync if direction changed
      if (oldType !== newType) {
        const items = db
          .prepare(
            'SELECT product_id, quantity FROM purchase_order_items WHERE purchase_order_id = ?',
          )
          .all(id) as { product_id: string | null; quantity: number }[]
        const updateStock = db.prepare(
          'UPDATE products SET stock_quantity = ROUND(stock_quantity + ?, 2) WHERE id = ?',
        )
        for (const it of items) {
          if (!it.product_id) continue
          const qty = Number(it.quantity || 0)
          // outbound = stock -, inbound = stock +
          const delta = newType === 'outbound' ? -qty : qty
          updateStock.run(delta, it.product_id)
        }
      }

      // Rewrite financial transactions for this purchase order
      db.prepare('DELETE FROM transactions WHERE related_id = ?').run(id)

      const total =
        Number(current.total_cost) +
        Number(current.shipping_fee || 0) +
        Number(current.other_costs || 0)
      const transType = newType === 'inbound' ? 'expense' : 'income'
      const ledger =
        newPaymentStatus === 'paid' ? 'cash' : newType === 'inbound' ? 'ap' : 'ar'

      db.prepare(
        `INSERT INTO transactions
         (id, type, ledger_type, amount, category, note, related_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        transType,
        ledger,
        total,
        newType === 'inbound' ? '采购进货' : '向供应商退货',
        `单据记录点：${newType}/${newPaymentStatus}`,
        id,
      )
    })()

    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: 'UPDATE_FAILED', message: e.message || '更新失败' }, { status: 400 })
  }
}
