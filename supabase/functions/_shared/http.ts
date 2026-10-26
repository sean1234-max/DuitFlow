// Shared helpers for DuitFlow Edge Functions (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

// The web build calls functions from the browser, which needs CORS; the phone app doesn't.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// A client acting as the signed-in user (row-level security applies) and that user.
export async function userFromRequest(
  req: Request,
): Promise<{ user: User; userClient: SupabaseClient } | Response> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'not_signed_in' }, 401);
  const userClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return json({ error: 'not_signed_in' }, 401);
  return { user: data.user, userClient };
}

// Service-role client: bypasses row-level security. Server-side only, never sent to the app.
export const adminClient = () =>
  createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
