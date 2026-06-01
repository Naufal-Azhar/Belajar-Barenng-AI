import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getProfileRepository } from '@/lib/profile-repository';
import { buildSessionCookie } from '@/lib/auth-token';

export const runtime = 'nodejs';

const schema = z.object({
  username: z.string().min(1),
  pin: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body tidak valid' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Request tidak valid' }, { status: 400 });
  }

  const repo = getProfileRepository();
  const profile = await repo.getByUsername(parsed.data.username);
  if (!profile) {
    return Response.json({ error: 'Username tidak ditemukan' }, { status: 401 });
  }
  const ok = await repo.verifyPin(parsed.data.username, parsed.data.pin);
  if (!ok) {
    return Response.json({ error: 'PIN salah' }, { status: 401 });
  }

  return Response.json(
    { profile: { username: profile.username, displayName: profile.displayName, hasPin: !!profile.pinHash } },
    { status: 200, headers: { 'Set-Cookie': buildSessionCookie(profile.profileId) } },
  );
}
