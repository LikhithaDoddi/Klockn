import { readFileSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

export function GET() {
  const html = readFileSync(join(process.cwd(), 'public', 'terms.html'), 'utf-8')
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
