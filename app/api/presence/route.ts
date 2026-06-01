import { NextRequest } from 'next/server';
import { touch } from '@/lib/presence';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get('x-device-id')?.trim();
  if (!deviceId) {
    return Response.json({ error: 'X-Device-Id diperlukan' }, { status: 400 });
  }
  const { admitted, active } = touch(deviceId);
  return Response.json({ admitted, active }, { status: admitted ? 200 : 503 });
}
