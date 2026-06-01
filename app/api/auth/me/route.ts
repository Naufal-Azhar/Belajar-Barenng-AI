import { NextRequest } from 'next/server';
import { getProfileRepository } from '@/lib/profile-repository';
import { readSessionToken, verifyToken } from '@/lib/auth-token';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = verifyToken(readSessionToken(request as Request));
  if (!session) return Response.json({ profile: null });

  const profile = await getProfileRepository().getByUsername(session.ownerId);
  if (!profile) return Response.json({ profile: null });

  return Response.json({
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      hasPin: !!profile.pinHash,
    },
  });
}
