import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JWKS_URL =
  Deno.env.get('CLERK_JWKS_URL') ??
  'https://welcomed-griffon-77.clerk.accounts.dev/.well-known/jwks.json';

// Extract issuer from JWKS URL (e.g. https://welcomed-griffon-77.clerk.accounts.dev)
const EXPECTED_ISSUER = JWKS_URL.replace('/.well-known/jwks.json', '');

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(JWKS_URL));
  return _jwks;
}

export async function validateClerkJWT(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: EXPECTED_ISSUER,
      clockTolerance: 60,
    });
    const sub = payload.sub;
    if (!sub || typeof sub !== 'string') return null;
    return sub;
  } catch {
    return null;
  }
}

export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}
