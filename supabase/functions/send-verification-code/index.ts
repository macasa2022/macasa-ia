const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { sendEmail } from '../_shared/send-email.ts'

// Rate-limit configuration (ad-hoc, DB-based — not a substitute for proper infra)
const MAX_SENDS_PER_HOUR = 3
const MAX_VERIFY_ATTEMPTS = 5
const LOCKOUT_MINUTES = 30

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

    // Get caller IP for additional throttling signal
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'

    if (action === 'send') {
      // 1) RATE LIMIT — max N sends per hour per email
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: recentSends } = await supabase
        .from('otp_send_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('email', normalizedEmail)
        .gte('created_at', oneHourAgo)

      if ((recentSends ?? 0) >= MAX_SENDS_PER_HOUR) {
        // Generic message to avoid enumeration
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Se este email estiver disponível, receberás um código em breve.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // 2) EMAIL ÚNICO — o email (ou uma variante: +etiqueta, pontos no Gmail) já tem conta?
      const { data: alreadyRegistered, error: dupError } = await supabase.rpc('email_is_registered', {
        _email: normalizedEmail,
      })
      if (dupError) console.error('email_is_registered error:', dupError)

      // Always record the send attempt (for rate-limit accounting)
      await supabase.from('otp_send_attempts').insert({
        email: normalizedEmail,
        ip_address: ipAddress,
      })

      // Email já registado: avisar claramente (não envia código)
      if (alreadyRegistered) {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'email_exists',
            error: 'Este email já está registado. Tenta iniciar sessão.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

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

      const { data: existingToken } = await supabase
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', normalizedEmail)
        .maybeSingle()

      let unsubscribeToken = existingToken?.token
      if (!unsubscribeToken) {
        unsubscribeToken = crypto.randomUUID()
        await supabase.from('email_unsubscribe_tokens').insert({
          email: normalizedEmail,
          token: unsubscribeToken,
        })
      }

      // Desenvolvimento local: mostra o código nos logs (nunca ativar em produção)
      if (Deno.env.get('DEV_LOG_OTP') === 'true') {
        console.log(`[DEV_LOG_OTP] Código para ${normalizedEmail}: ${verificationCode}`)
      }

      const emailPayload = {
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
          unsubscribe_token: unsubscribeToken,
        }

      // Envio imediato (SMTP, Resend ou consola).
      let emailError: unknown = null
      try {
        await sendEmail(emailPayload)
      } catch (err) {
        emailError = err
      }

      if (emailError) {
        console.error('Email send error:', emailError)
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Enviámos um código de 6 dígitos para o teu email.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (action === 'verify') {
      if (!code || typeof code !== 'string' || code.length !== 6) {
        return new Response(JSON.stringify({ error: 'Invalid code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get most recent active code for this email (regardless of code value)
      const { data: latestCode } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!latestCode) {
        return new Response(JSON.stringify({ error: 'Código inválido ou expirado.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // BRUTE-FORCE PROTECTION — check lockout
      if (latestCode.locked_until && new Date(latestCode.locked_until) > new Date()) {
        return new Response(
          JSON.stringify({
            error: 'Demasiadas tentativas. Aguarda alguns minutos e pede um novo código.',
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Check code value
      if (latestCode.code !== code) {
        const newAttempts = (latestCode.attempts ?? 0) + 1
        const updates: Record<string, unknown> = { attempts: newAttempts }

        if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
          updates.locked_until = new Date(
            Date.now() + LOCKOUT_MINUTES * 60 * 1000
          ).toISOString()
        }

        await supabase
          .from('email_verification_codes')
          .update(updates)
          .eq('id', latestCode.id)

        return new Response(
          JSON.stringify({
            error:
              newAttempts >= MAX_VERIFY_ATTEMPTS
                ? 'Demasiadas tentativas. Pede um novo código.'
                : 'Código inválido ou expirado.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Mark as verified
      await supabase
        .from('email_verification_codes')
        .update({ verified: true })
        .eq('id', latestCode.id)

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
