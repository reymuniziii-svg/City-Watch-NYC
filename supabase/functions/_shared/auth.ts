import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getClerkConfig(): { jwksUrl: string; issuer: string } {
  const jwksUrl = Deno.env.get('CLERK_JWKS_URL');
  if (!jwksUrl) {
    throw new Error('CLERK_JWKS_URL environment variable is required but not set');
  }
  const issuer = jwksUrl.replace('/.well-known/jwks.json', '');
  return { jwksUrl, issuer };
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let _issuer: string | null = null;

function getJWKS(): { jwks: ReturnType<typeof createRemoteJWKSet>; issuer: string } {
  if (!_jwks || !_issuer) {
    const { jwksUrl, issuer } = getClerkConfig();
    _jwks = createRemoteJWKSet(new URL(jwksUrl));
    _issuer = issuer;
  }
  return { jwks: _jwks, issuer: _issuer };
}

export async function validateClerkJWT(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { jwks, issuer } = getJWKS();
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
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
