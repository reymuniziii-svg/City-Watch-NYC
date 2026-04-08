import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { validateClerkJWT, createAdminClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'txt'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const userId = await validateClerkJWT(req.headers.get('Authorization'));
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createAdminClient();

  try {
    // GET — list platforms for the authenticated user
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('policy_platforms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST — upload a new platform file
    if (req.method === 'POST') {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return new Response(JSON.stringify({ error: 'Only PDF and TXT files are allowed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ error: 'File must be 10MB or smaller' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileId = crypto.randomUUID();
      const storagePath = `${userId}/${fileId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('policy-platforms')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from('policy_platforms')
        .insert({
          id: fileId,
          user_id: userId,
          filename: file.name,
          storage_path: storagePath,
          file_type: extension as 'pdf' | 'txt',
          file_size: file.size,
          status: 'uploaded',
        })
        .select('id, filename, status')
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE — remove a platform and its storage file
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const platformId = url.searchParams.get('id');
      if (!platformId) {
        return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch storage path to delete the file
      const { data: platform } = await supabase
        .from('policy_platforms')
        .select('storage_path')
        .eq('id', platformId)
        .eq('user_id', userId)
        .single();

      if (platform?.storage_path) {
        await supabase.storage.from('policy-platforms').remove([platform.storage_path]);
      }

      const { error } = await supabase
        .from('policy_platforms')
        .delete()
        .eq('id', platformId)
        .eq('user_id', userId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
