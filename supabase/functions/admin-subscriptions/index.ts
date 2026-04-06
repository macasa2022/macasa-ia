import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PREMIUM_PRICE_ID = "price_1TIySVFe9lD6nlF4sh5D9WWP";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SUBS] ${step}${detailsStr}`);
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const adminUser = userData.user;
    if (!adminUser) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: adminUser.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Unauthorized: admin role required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    logStep("Action requested", { action });

    // LIST
    if (!action || action === "list") {
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("user_id, email");

      const subscriptionMap: Record<string, { plan: string; subscription_id: string | null; subscription_end: string | null }> = {};

      for (const profile of (profiles || [])) {
        if (!profile.email) {
          subscriptionMap[profile.user_id] = { plan: "Gratuito", subscription_id: null, subscription_end: null };
          continue;
        }
        try {
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          if (customers.data.length === 0) {
            subscriptionMap[profile.user_id] = { plan: "Gratuito", subscription_id: null, subscription_end: null };
            continue;
          }
          const subs = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: "active",
            limit: 1,
          });
          if (subs.data.length > 0) {
            const sub = subs.data[0];
            subscriptionMap[profile.user_id] = {
              plan: "Premium",
              subscription_id: sub.id,
              subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
            };
          } else {
            subscriptionMap[profile.user_id] = { plan: "Gratuito", subscription_id: null, subscription_end: null };
          }
        } catch (e) {
          logStep("Error checking subscription for user", { user_id: profile.user_id, error: String(e) });
          subscriptionMap[profile.user_id] = { plan: "Gratuito", subscription_id: null, subscription_end: null };
        }
      }

      return new Response(JSON.stringify({ subscriptions: subscriptionMap }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPGRADE
    if (action === "upgrade") {
      const { user_email } = body;
      if (!user_email) throw new Error("user_email required");
      logStep("Upgrading user", { user_email });

      const customers = await stripe.customers.list({ email: user_email, limit: 1 });
      let customerId: string;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: user_email });
        customerId = customer.id;
      }
      logStep("Customer ID", { customerId });

      // Check if already has active subscription
      const existingSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (existingSubs.data.length > 0) {
        logStep("Already has active subscription");
        return new Response(JSON.stringify({ success: true, message: "Already premium" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create subscription with payment_behavior that doesn't require immediate payment
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: PREMIUM_PRICE_ID }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        trial_period_days: 36500, // ~100 years trial for admin-granted subscriptions
      });
      logStep("Subscription created", { subscriptionId: subscription.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DOWNGRADE
    if (action === "downgrade") {
      const { subscription_id, user_email } = body;
      logStep("Downgrading", { subscription_id, user_email });

      if (subscription_id) {
        await stripe.subscriptions.cancel(subscription_id);
      } else if (user_email) {
        const customers = await stripe.customers.list({ email: user_email, limit: 1 });
        if (customers.data.length > 0) {
          const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active" });
          for (const sub of subs.data) {
            await stripe.subscriptions.cancel(sub.id);
          }
          // Also cancel trialing subscriptions
          const trialSubs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "trialing" });
          for (const sub of trialSubs.data) {
            await stripe.subscriptions.cancel(sub.id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});