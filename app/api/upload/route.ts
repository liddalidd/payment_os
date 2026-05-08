import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export async function POST(req: Request) {
  const fd = await req.formData()
  const file = fd.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'NO_FILE', message: '缺少文件' }, { status: 400 })
  }
  const ext = path.extname(file.name).toLowerCase() || '.bin'
  const fname = `${randomUUID()}${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, fname), Buffer.from(await file.arrayBuffer()))
  return Response.json({ url: `/uploads/${fname}` })
}
