import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cookie name di-inline (jangan import lib/gate.ts yang pakai node crypto —
// middleware berjalan di Edge runtime).
const GATE_COOKIE = 'belajar.gate';

// Redirect ke /gate jika cookie gate belum ada. Verifikasi tanda tangan
// dilakukan di route Node (mis. /api/chat) — middleware hanya untuk UX.
export function middleware(req: NextRequest) {
  if (req.cookies.get(GATE_COOKIE)?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/gate';
  url.search = '';
  return NextResponse.redirect(url);
}

// Lewati: /gate, semua /api, internal _next, favicon, dan file statis (mengandung titik).
export const config = {
  matcher: ['/((?!gate|api|_next|favicon.ico|.*\\.).*)'],
};
