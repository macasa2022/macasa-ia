const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { email, action, code } = body

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    const normalizedEmail = email.trim().toLowerCase()
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    if (action === 'send') {
      const verificationCode = String(Math.floor(100000 + Math.random() * 900000))

      // Delete old codes for this email
      await supabase
        .from('email_verification_codes')
        .delete()
        .eq('email', normalizedEmail)

      // Insert new code
      const { error: insertError } = await supabase
        .from('email_verification_codes')
        .insert({ email: normalizedEmail, code: verificationCode })

      if (insertError) {
        console.error('Insert error:', insertError)
        return new Response(JSON.stringify({ error: 'Failed to create code' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Send email via queue
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #000;">MACASA IA</h1>
          </div>
          <p style="font-size: 14px; color: #555; line-height: 1.5;">O teu código de verificação é:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; background: #f3f0ff; padding: 12px 24px; border-radius: 8px;">
              ${verificationCode}
            </span>
          </div>
          <p style="font-size: 13px; color: #999; line-height: 1.5;">
            Este código expira em 5 minutos. Se não solicitaste este código, ignora este email.
          </p>
        </div>
      `

      const idempotencyKey = `verify-${normalizedEmail}-${Date.now()}`

      const { error: emailError } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          to: normalizedEmail,
          subject: 'O teu código de verificação - MACASA IA',
          html: emailHtml,
          text: `O teu código de verificação é: ${verificationCode}. Este código expira em 5 minutos.`,
          from: 'MACASA IA <noreply@logicpathways.online>',
          sender_domain: 'notify.logicpathways.online',
          purpose: 'transactional',
          idempotency_key: idempotencyKey,
          message_id: idempotencyKey,
          label: 'verification-code',
          queued_at: new Date().toISOString(),
        },
      })

      if (emailError) {
        console.error('Email enqueue error:', emailError)
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'verify') {
      if (!code || typeof code !== 'string' || code.length !== 6) {
        return new Response(JSON.stringify({ error: 'Invalid code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('code', code)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Código inválido ou expirado.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Mark as verified
      await supabase
        .from('email_verification_codes')
        .update({ verified: true })
        .eq('id', data.id)

      return new Response(JSON.stringify({ success: true, verified: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
