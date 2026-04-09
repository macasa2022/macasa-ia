import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, action } = await req.json()

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    if (action === 'verify') {
      const { code } = await req.json().catch(() => ({ code: '' }))
      // code is passed in the original body
    }

    if (action === 'send') {
      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000))

      // Delete old codes for this email
      await supabase
        .from('email_verification_codes')
        .delete()
        .eq('email', email.trim().toLowerCase())

      // Insert new code
      const { error: insertError } = await supabase
        .from('email_verification_codes')
        .insert({
          email: email.trim().toLowerCase(),
          code,
        })

      if (insertError) {
        return new Response(JSON.stringify({ error: 'Failed to create code' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Send email via Lovable email infrastructure
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
      if (!lovableApiKey) {
        return new Response(JSON.stringify({ error: 'Email service not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #000;">MACASA IA</h1>
          </div>
          <p style="font-size: 14px; color: #555; line-height: 1.5;">
            O teu código de verificação é:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; background: #f3f0ff; padding: 12px 24px; border-radius: 8px;">
              ${code}
            </span>
          </div>
          <p style="font-size: 13px; color: #999; line-height: 1.5;">
            Este código expira em 5 minutos. Se não solicitaste este código, ignora este email.
          </p>
        </div>
      `

      // Use the enqueue_email RPC to send via the email queue
      const { error: emailError } = await supabase.rpc('enqueue_email', {
        p_queue_name: 'transactional_emails',
        p_message: JSON.stringify({
          to: email.trim(),
          subject: 'O teu código de verificação - MACASA IA',
          html: emailHtml,
          from: `MACASA IA <noreply@logicpathways.online>`,
          sender_domain: 'notify.logicpathways.online',
        }),
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
      const body = JSON.parse(await new Response(req.body).text().catch(() => '{}'))
      // Re-parse won't work since body already consumed. Let me fix the approach.
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
