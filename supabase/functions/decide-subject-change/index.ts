import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_SUBJECTS = ['Matemática', 'Física', 'Química']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Validate caller JWT and extract user
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Service role client (bypasses RLS)
  const admin = createClient(supabaseUrl, serviceKey)

  // Verify caller is admin
  const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (roleErr || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { request_id, decision, admin_notes } = body
  if (!request_id || !['Aprovado', 'Rejeitado'].includes(decision)) {
    return new Response(JSON.stringify({ error: 'request_id and valid decision required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Fetch the request
  const { data: request, error: reqErr } = await admin
    .from('subject_change_requests')
    .select('*')
    .eq('id', request_id)
    .maybeSingle()

  if (reqErr || !request) {
    return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (request.status !== 'Pendente') {
    return new Response(JSON.stringify({ error: `Request already ${request.status}` }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // If approving, validate requested subject
  if (decision === 'Aprovado' && !ALLOWED_SUBJECTS.includes(request.requested_subject)) {
    return new Response(JSON.stringify({ error: 'Invalid requested subject' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const trimmedNotes = (admin_notes || '').trim().slice(0, 1000) || null

  // Update request
  const { error: updErr } = await admin
    .from('subject_change_requests')
    .update({
      status: decision,
      admin_notes: trimmedNotes,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', request_id)

  if (updErr) {
    console.error('Failed to update request', updErr)
    return new Response(JSON.stringify({ error: 'Failed to update request' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // If approved, update profile
  if (decision === 'Aprovado') {
    const { error: profErr } = await admin
      .from('profiles')
      .update({
        disciplinas_favoritas: [request.requested_subject],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', request.user_id)

    if (profErr) {
      console.error('Failed to update profile', profErr)
      // Roll back request decision
      await admin.from('subject_change_requests').update({
        status: 'Pendente', decided_by: null, decided_at: null, admin_notes: null,
      }).eq('id', request_id)
      return new Response(JSON.stringify({ error: 'Failed to update student profile' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  // Send notification email (non-blocking — don't fail the decision if email fails)
  try {
    const templateName = decision === 'Aprovado' ? 'subject-change-approved' : 'subject-change-rejected'
    await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName,
        recipientEmail: request.user_email,
        idempotencyKey: `subject-change-${decision.toLowerCase()}-${request_id}`,
        templateData: {
          nome: request.user_name,
          current_subject: request.current_subject,
          requested_subject: request.requested_subject,
          admin_notes: trimmedNotes,
        },
      },
    })
  } catch (e) {
    console.error('Failed to send notification email', e)
  }

  return new Response(JSON.stringify({ success: true, decision }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
