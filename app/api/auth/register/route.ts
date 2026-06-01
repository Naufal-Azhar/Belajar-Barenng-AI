import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getProfileRepository,
  UsernameTakenError,
  isValidUsername,
} from '@/lib/profile-repository';
import { buildSessionCookie } from '@/lib/auth-token';

export const runtime = 'nodejs';

const schema = z.object({
  username: z.string().min(3).max(20),
  displayName: z.string().max(40).optional(),
  pin: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(4).max(12).optional(),
  ),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body tidak valid' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isValidUsername(parsed.data.username)) {
    return Response.json(
      { error: 'Username 3-20 karakter (huruf/angka/_). PIN minimal 4 digit.' },
      { status: 400 },
    );
  }
  try {
    const profile = await getProfileRepository().create(parsed.data);
    return Response.json(
      { profile: { username: profile.username, displayName: profile.displayName, hasPin: !!profile.pinHash } },
      { status: 201, headers: { 'Set-Cookie': buildSessionCookie(profile.profileId) } },
    );
  } catch (err) {
    if (err instanceof UsernameTakenError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    return Response.json({ error: 'Gagal membuat profil' }, { status: 500 });
  }
}
