import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getStripeKey } from "../_shared/stripe-config.ts";
import {
  GRACE_DAYS,
  PAYMENT_METHODS,
  STRIPE_API_VERSION_MBWAY,
  findCustomerId,
  getStripePremium,
} from "../_shared/stripe-premium.ts";

// Inicia a compra do Premium: cria uma subscrição mensal paga por fatura
// (cartão ou MB WAY) e devolve o link da página de pagamento da primeira fatura.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PREMIUM_PRICE_ID = Deno.env.get("STRIPE_PREMIUM_PRICE_ID") || "price_1TIySVFe9lD6nlF4sh5D9WWP";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Not authorized" }, 401);
    const { data, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !data.user?.email) return json({ error: "Not authenticated" }, 401);
    const user = data.user;

    const stripeKey = getStripeKey();
    if (!stripeKey) return json({ error: "Os pagamentos ainda não estão configurados." }, 503);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const reqOpts = { apiVersion: STRIPE_API_VERSION_MBWAY } as Stripe.RequestOptions;

    // Já é Premium, ou já tem uma compra iniciada por pagar?
    const current = await getStripePremium(stripe, user.email!);
    if (current.premium) {
      return json({ already_premium: true, url: current.invoice_url });
    }
    if (current.state === "pending_first" && current.invoice_url) {
      return json({ url: current.invoice_url });
    }

    // Cliente Stripe
    let customerId = current.customer_id ?? (await findCustomerId(stripe, user.email!));
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email!, metadata: { user_id: user.id } },
        reqOpts,
      );
      customerId = customer.id;
    }

    // Subscrição mensal paga por fatura (cartão ou MB WAY), prazo de GRACE_DAYS dias
    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: PREMIUM_PRICE_ID }],
        collection_method: "send_invoice",
        days_until_due: GRACE_DAYS,
        // deno-lint-ignore no-explicit-any
        payment_settings: { payment_method_types: PAYMENT_METHODS as any },
        metadata: { user_id: user.id },
      },
      reqOpts,
    );

    const invoiceId = typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;
    if (!invoiceId) throw new Error("Fatura não criada");

    let invoice = await stripe.invoices.retrieve(invoiceId, undefined, reqOpts);
    if (invoice.status === "draft") {
      invoice = await stripe.invoices.finalizeInvoice(invoiceId, {}, reqOpts);
    }
    if (!invoice.hosted_invoice_url) throw new Error("Página de pagamento indisponível");

    return json({ url: invoice.hosted_invoice_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CHECKOUT]", message);
    return json({ error: message }, 500);
  }
});
