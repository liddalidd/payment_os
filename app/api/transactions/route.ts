import { db } from '@/lib/db/sqlite'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from')

  let rows
  if (from) {
    rows = db.prepare(`
      SELECT * FROM transactions WHERE created_at >= ? ORDER BY created_at ASC
    `).all(from)
  } else {
    rows = db.prepare('SELECT * FROM transactions ORDER BY created_at ASC').all()
  }
  return Response.json(rows)
}
