import { NextRequest } from 'next/server';
import { checkCode, buildGateCookie } from '@/lib/gate';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  if (!checkCode(body.code ?? '')) {
    return Response.json({ error: 'Kode salah' }, { status: 401 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': buildGateCookie() },
  });
}
