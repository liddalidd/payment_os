import { db } from '@/lib/db/sqlite'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') || 7)))
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)
  const startIso = startDate.toISOString()

  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE status = 'completed' AND created_at >= ?
    ORDER BY created_at ASC
  `).all(startIso)

  const items = db.prepare('SELECT * FROM order_items').all()

  return Response.json({ orders, items })
}
