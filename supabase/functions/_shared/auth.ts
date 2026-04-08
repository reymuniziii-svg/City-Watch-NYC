import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JWKS_URL =
  Deno.env.get('CLERK_JWKS_URL') ??
  'https://welcomed-griffon-77.clerk.accounts.dev/.well-known/jwks.json';

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(JWKS_URL));
  return _jwks;
}

export async function validateClerkJWT(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, getJWKS(), { clockTolerance: 60 });
    return (payload.sub as string) ?? null;
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
