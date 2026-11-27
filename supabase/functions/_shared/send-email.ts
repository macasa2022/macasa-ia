// Envio de emails.
// EMAIL_PROVIDER: "smtp" | "resend" | "console"
//   - "smtp": qualquer servidor SMTP, p.ex. Gmail com palavra-passe de aplicação
//       SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=...@gmail.com  SMTP_PASS=(palavra-passe de aplicação)
//   - por omissão: smtp se houver SMTP_HOST+SMTP_PASS, resend se existir RESEND_API_KEY, senão console.
//   - "console" só escreve o email nos logs (útil para desenvolvimento local).
// EMAIL_FROM (opcional): substitui o remetente, ex. "MACASA IA <noreply@o-teu-dominio.pt>".

export type EmailPayload = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  unsubscribe_token?: string;
  [key: string]: unknown;
};

export class EmailSendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function emailProvider(): "smtp" | "resend" | "console" {
  const p = (Deno.env.get("EMAIL_PROVIDER") || "").toLowerCase();
  if (p === "smtp" || p === "resend" || p === "console") return p;
  if (Deno.env.get("SMTP_HOST") && Deno.env.get("SMTP_PASS")) return "smtp";
  if (Deno.env.get("RESEND_API_KEY")) return "resend";
  return "console";
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = emailProvider();
  const from = Deno.env.get("EMAIL_FROM") || payload.from;

  if (provider === "console") {
    console.log(
      `\n[EMAIL:console] Para: ${payload.to}\nDe: ${from}\nAssunto: ${payload.subject}\n${payload.text || payload.html}\n`,
    );
    return;
  }

  if (provider === "smtp") {
    const host = Deno.env.get("SMTP_HOST");
    const user = Deno.env.get("SMTP_USER");
    const pass = Deno.env.get("SMTP_PASS");
    if (!host || !user || !pass) throw new EmailSendError(500, "SMTP_HOST/SMTP_USER/SMTP_PASS não configurados");
    const port = Number(Deno.env.get("SMTP_PORT") || "465");
    const nodemailer = (await import("npm:nodemailer@6.9.16")).default;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = TLS direto; 587 = STARTTLS
      auth: { user, pass },
    });
    // O Gmail só deixa enviar com o próprio endereço (ou aliases configurados na conta)
    const smtpFrom = Deno.env.get("EMAIL_FROM") || `MACASA IA <${user}>`;
    try {
      await transporter.sendMail({ from: smtpFrom, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
    } catch (err) {
      throw new EmailSendError(502, `SMTP: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }

  // Resend — https://resend.com/docs/api-reference/emails/send-email
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new EmailSendError(500, "RESEND_API_KEY não configurada");
  const headers: Record<string, string> = {};
  const siteUrl = Deno.env.get("SITE_URL");
  if (payload.unsubscribe_token && siteUrl) {
    headers["List-Unsubscribe"] = `<${siteUrl}/unsubscribe?token=${payload.unsubscribe_token}>`;
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers,
    }),
  });
  if (!resp.ok) {
    throw new EmailSendError(resp.status, `Resend ${resp.status}: ${await resp.text()}`);
  }
}
