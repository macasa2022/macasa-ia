// Regras do Premium pago via Stripe (fatura mensal, cartão ou MB WAY).
//
// Como funciona:
//  - A subscrição usa collection_method = "send_invoice": todos os meses o Stripe
//    emite uma fatura e envia-a por email; o aluno paga-a na página da fatura
//    (cartão ou MB WAY). O MB WAY só é suportado neste modo.
//  - A fatura vence GRACE_DAYS (2) dias depois de emitida.
//  - Renovação por pagar e dentro do prazo  -> continua Premium, com aviso ("grace").
//  - Prazo ultrapassado                      -> subscrição cancelada, fatura anulada, volta a Gratuito.
//  - Primeira fatura (compra) por pagar      -> ainda não é Premium ("pending_first").

import type Stripe from "https://esm.sh/stripe@18.5.0";

// Versão da API necessária para usar MB WAY em subscrições/faturas.
export const STRIPE_API_VERSION_MBWAY = "2026-07-29.dahlia";
export const GRACE_DAYS = 2;
export const PAYMENT_METHODS = ["card", "mb_way"];

export type PremiumState = "active" | "grace" | "pending_first" | "none";

export type StripePremium = {
  premium: boolean;
  state: PremiumState;
  customer_id: string | null;
  subscription_id: string | null;
  period_end: string | null;   // fim do período pago
  due_date: string | null;     // prazo da fatura por pagar
  invoice_url: string | null;  // página da fatura por pagar
};

const NONE: StripePremium = {
  premium: false, state: "none", customer_id: null, subscription_id: null,
  period_end: null, due_date: null, invoice_url: null,
};

const iso = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);

// Nas versões recentes da API o fim do período está nos items da subscrição.
function periodEnd(sub: Stripe.Subscription): string | null {
  // deno-lint-ignore no-explicit-any
  const s = sub as any;
  return iso(s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null);
}

export async function findCustomerId(stripe: Stripe, email: string): Promise<string | null> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  return customers.data[0]?.id ?? null;
}

/**
 * Estado do Premium pago de um cliente. Se encontrar uma fatura vencida,
 * cancela a subscrição e anula a fatura (rebaixamento automático).
 */
export async function getStripePremium(stripe: Stripe, email: string, now = new Date()): Promise<StripePremium> {
  const customerId = await findCustomerId(stripe, email);
  if (!customerId) return NONE;

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.latest_invoice"],
  });

  const candidates = subs.data
    .filter((s) => ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status))
    .sort((a, b) => b.created - a.created);

  for (const sub of candidates) {
    const base = { ...NONE, customer_id: customerId, subscription_id: sub.id, period_end: periodEnd(sub) };

    // Premium atribuído antigamente pelo admin via "trial" longo
    if (sub.status === "trialing") return { ...base, premium: true, state: "active" };

    const inv = (typeof sub.latest_invoice === "object" ? sub.latest_invoice : null) as Stripe.Invoice | null;
    if (!inv || inv.status === "paid") {
      if (sub.status === "active") return { ...base, premium: true, state: "active" };
      continue;
    }

    if (inv.status === "open") {
      const due = inv.due_date ? new Date(inv.due_date * 1000) : null;
      const overdue = !!due && now > due;
      const isFirst = inv.billing_reason === "subscription_create";

      if (overdue) {
        // Prazo ultrapassado: anular fatura e cancelar -> volta a Gratuito
        try { await stripe.invoices.voidInvoice(inv.id!); } catch (e) { console.error("voidInvoice", e); }
        try { await stripe.subscriptions.cancel(sub.id); } catch (e) { console.error("cancel", e); }
        console.log(`[stripe-premium] Subscrição ${sub.id} cancelada por falta de pagamento.`);
        continue;
      }

      return {
        ...base,
        premium: !isFirst,                       // na compra só é Premium depois de pagar
        state: isFirst ? "pending_first" : "grace",
        due_date: due ? due.toISOString() : null,
        invoice_url: inv.hosted_invoice_url ?? null,
      };
    }
    // draft / void / uncollectible -> ignorar esta subscrição
  }

  return { ...NONE, customer_id: customerId };
}
