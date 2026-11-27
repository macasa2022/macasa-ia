import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getStripeKey } from "../_shared/stripe-config.ts";
import { getStripePremium } from "../_shared/stripe-premium.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // 1) Premium sem Stripe: admin, escola ou atribuído manualmente por um admin
    const { data: manualOrSchool } = await supabaseClient.rpc("is_premium_user", { _user_id: user.id });
    if (manualOrSchool) {
      logStep("Premium (admin/escola/manual)");
      return new Response(JSON.stringify({ subscribed: true, subscription_end: null, source: "manual" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2) Stripe (só se estiver configurado)
    const stripeKey = getStripeKey();
    if (!stripeKey) {
      logStep("Stripe não configurado — plano gratuito");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const st = await getStripePremium(stripe, user.email);
    logStep("Stripe premium", { state: st.state, subscription: st.subscription_id });

    // Guardar a confirmação para a função da IA não ter de consultar o Stripe em cada pergunta
    await supabaseClient.from("stripe_premium_cache").upsert({
      user_id: user.id, premium: st.premium, checked_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      subscribed: st.premium,
      subscription_end: st.period_end,
      source: st.premium ? "stripe" : null,
      state: st.state,                 // active | grace | pending_first | none
      due_date: st.due_date,           // prazo da fatura por pagar (se houver)
      invoice_url: st.invoice_url,     // link para pagar a fatura (se houver)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
