import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getStripeKey } from "../_shared/stripe-config.ts";
import { getStripePremium } from "../_shared/stripe-premium.ts";

// Gestão de planos pelo admin.
// - Premium manual (tabela manual_premium_members) funciona SEM Stripe.
// - Se o Stripe estiver configurado, as subscrições pagas também aparecem e
//   podem ser canceladas no "↓ Gratuito".

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanSource = "admin" | "school" | "manual" | "stripe" | null;
type PlanInfo = { plan: "Premium" | "Gratuito"; source: PlanSource; subscription_id: string | null; subscription_end: string | null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const logStep = (step: string, details?: unknown) =>
  console.log(`[ADMIN-SUBS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // --- Verificar admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) throw new Error("Not authenticated");
    const adminUser = userData.user;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: adminUser.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Unauthorized: admin role required" }, 403);

    const stripeKey = getStripeKey();
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";
    logStep("Action requested", { action, stripe: !!stripe });

    // Resolver user_id (aceita user_id ou user_email)
    const resolveUserId = async (): Promise<string> => {
      if (body.user_id) return body.user_id;
      if (!body.user_email) throw new Error("user_id ou user_email obrigatório");
      const { data } = await supabase.from("profiles").select("user_id").eq("email", body.user_email).maybeSingle();
      if (!data?.user_id) throw new Error("Utilizador não encontrado");
      return data.user_id;
    };

    // ---------------- LIST ----------------
    if (action === "list") {
      const [{ data: profiles }, { data: manual }, { data: school }, { data: admins }] = await Promise.all([
        supabase.from("profiles").select("user_id, email"),
        supabase.from("manual_premium_members").select("user_id"),
        supabase.from("school_premium_members").select("user_id").not("user_id", "is", null),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      const manualSet = new Set((manual || []).map((r) => r.user_id));
      const schoolSet = new Set((school || []).map((r) => r.user_id));
      const adminSet = new Set((admins || []).map((r) => r.user_id));

      const subscriptions: Record<string, PlanInfo> = {};
      for (const p of profiles || []) {
        const free: PlanInfo = { plan: "Gratuito", source: null, subscription_id: null, subscription_end: null };
        if (manualSet.has(p.user_id)) { subscriptions[p.user_id] = { ...free, plan: "Premium", source: "manual" }; continue; }
        if (schoolSet.has(p.user_id)) { subscriptions[p.user_id] = { ...free, plan: "Premium", source: "school" }; continue; }

        let info: PlanInfo = free;
        if (stripe && p.email) {
          try {
            const st = await getStripePremium(stripe, p.email);
            if (st.premium) {
              info = { plan: "Premium", source: "stripe", subscription_id: st.subscription_id, subscription_end: st.period_end };
            }
          } catch (e) {
            logStep("Stripe lookup failed", { user_id: p.user_id, error: String(e) });
          }
        }
        // Admin sem outro plano: acesso total
        if (info.plan === "Gratuito" && adminSet.has(p.user_id)) info = { ...free, plan: "Premium", source: "admin" };
        subscriptions[p.user_id] = info;
      }
      return json({ subscriptions, stripe_configured: !!stripe });
    }

    // ---------------- UPGRADE (Premium manual) ----------------
    if (action === "upgrade") {
      const userId = await resolveUserId();
      const { error } = await supabase
        .from("manual_premium_members")
        .upsert({ user_id: userId, granted_by: adminUser.id, note: body.note ?? null }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      logStep("Manual premium granted", { userId });
      return json({ success: true });
    }

    // ---------------- DOWNGRADE ----------------
    if (action === "downgrade") {
      const userId = await resolveUserId();
      const { error } = await supabase.from("manual_premium_members").delete().eq("user_id", userId);
      if (error) throw new Error(error.message);

      // Se tiver subscrição Stripe (paga ou antiga atribuída pelo admin), cancelar também
      if (stripe && body.subscription_id) {
        await stripe.subscriptions.cancel(body.subscription_id);
        logStep("Stripe subscription cancelled", { subscription_id: body.subscription_id });
      }
      logStep("Downgraded", { userId });
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return json({ error: message }, 500);
  }
});
