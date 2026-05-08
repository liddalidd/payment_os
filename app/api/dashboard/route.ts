import { db } from '@/lib/db/sqlite'

interface OrderRow { total_amount: number; created_at: string }

export async function GET(req: Request) {
  const url = new URL(req.url)
  const daysRange = Math.max(1, Math.min(365, Number(url.searchParams.get('days') || 7)))

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const rangeStart = new Date(now)
  rangeStart.setDate(rangeStart.getDate() - (daysRange - 1))
  rangeStart.setHours(0, 0, 0, 0)
  const rangeStartIso = rangeStart.toISOString()

  const todayRow = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) AS sum
    FROM orders
    WHERE created_at >= ? AND status = 'completed'
  `).get(todayStart) as { sum: number }

  const monthCountRow = db.prepare(`
    SELECT COUNT(*) AS count FROM orders WHERE created_at >= ?
  `).get(monthStart) as { count: number }

  const lowStockRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM products
    WHERE COALESCE(stock_quantity, 0) <= COALESCE(min_stock_level, 5)
  `).get() as { count: number }

  const customerRow = db.prepare('SELECT COUNT(*) AS count FROM customers').get() as { count: number }

  const rangeOrders = db.prepare(`
    SELECT total_amount, created_at
    FROM orders
    WHERE created_at >= ? AND status = 'completed'
    ORDER BY created_at ASC
  `).all(rangeStartIso) as OrderRow[]

  const historyMap = new Map<string, number>()
  for (let i = 0; i < daysRange; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - (daysRange - 1) + i)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    historyMap.set(key, 0)
  }
  for (const o of rangeOrders) {
    const d = new Date(o.created_at)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (historyMap.has(key)) historyMap.set(key, (historyMap.get(key) || 0) + Number(o.total_amount))
  }
  const revenueHistory = Array.from(historyMap, ([name, amount]) => ({ name, amount }))

  return Response.json({
    todayRevenue: Number(todayRow.sum) || 0,
    monthOrderCount: monthCountRow.count || 0,
    lowStockCount: lowStockRow.count || 0,
    totalCustomers: customerRow.count || 0,
    revenueHistory,
  })
}
