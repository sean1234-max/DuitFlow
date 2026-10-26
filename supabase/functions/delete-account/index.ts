// Deletes the signed-in user's account. Their rows go with it (on delete cascade).
// Required for app store listings that let people create accounts.
import { adminClient, corsHeaders, json, userFromRequest } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const auth = await userFromRequest(req);
    if (auth instanceof Response) return auth;
    const { error } = await adminClient().auth.admin.deleteUser(auth.user.id);
    if (error) {
      console.error('deleteUser failed', auth.user.id, error);
      return json({ error: 'delete_failed' }, 500);
    }
    return json({ deleted: true });
  } catch (error) {
    console.error('delete-account error', error);
    return json({ error: 'server_error' }, 500);
  }
});
