import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CONVERT-SCHOOL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem autorização");

    // Validate caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Utilizador inválido");

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr) throw new Error(`Erro ao verificar role: ${roleErr.message}`);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body?.action as string;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (action === "create") {
      const contactRequestId = body?.contact_request_id as string | null;
      const schoolName = (body?.school_name as string | undefined)?.trim();
      const rawEmails = body?.emails as string[] | undefined;

      if (!schoolName) throw new Error("Nome da escola obrigatório");
      if (!Array.isArray(rawEmails) || rawEmails.length === 0)
        throw new Error("Lista de emails vazia");
      if (rawEmails.length > MAX_EMAILS)
        throw new Error(`Máximo ${MAX_EMAILS} emails por escola`);

      // Normalize, dedupe, validate
      const seen = new Set<string>();
      const valid: string[] = [];
      const invalid: string[] = [];
      for (const raw of rawEmails) {
        const e = String(raw || "").trim().toLowerCase();
        if (!e) continue;
        if (!EMAIL_RE.test(e)) {
          invalid.push(raw);
          continue;
        }
        if (seen.has(e)) continue;
        seen.add(e);
        valid.push(e);
      }
      if (valid.length === 0) throw new Error("Nenhum email válido encontrado");

      log("Creating school client", { schoolName, count: valid.length, invalid: invalid.length });

      const { data: school, error: schoolErr } = await admin
        .from("school_clients")
        .insert({
          name: schoolName,
          contact_request_id: contactRequestId,
          created_by: userData.user.id,
        })
        .select()
        .single();
      if (schoolErr) throw new Error(`Erro ao criar escola: ${schoolErr.message}`);

      // Lookup existing profiles by email to set user_id
      const { data: existingProfiles } = await admin
        .from("profiles")
        .select("user_id, email")
        .in("email", valid);
      const emailToUser = new Map<string, string>();
      (existingProfiles || []).forEach((p) => {
        if (p.email) emailToUser.set(p.email.toLowerCase(), p.user_id);
      });

      const rows = valid.map((email) => ({
        school_client_id: school.id,
        email,
        user_id: emailToUser.get(email) || null,
        added_by: userData.user.id,
      }));

      const { data: inserted, error: insErr } = await admin
        .from("school_premium_members")
        .upsert(rows, { onConflict: "email", ignoreDuplicates: false })
        .select();
      if (insErr) throw new Error(`Erro ao inserir membros: ${insErr.message}`);

      // Mark contact request as Convertido
      if (contactRequestId) {
        await admin
          .from("contact_requests")
          .update({ status: "Convertido" })
          .eq("id", contactRequestId);
      }

      return new Response(
        JSON.stringify({
          school,
          inserted_count: inserted?.length || 0,
          linked_existing_users: emailToUser.size,
          invalid_emails: invalid,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (action === "add_emails") {
      const schoolId = body?.school_client_id as string;
      const rawEmails = body?.emails as string[] | undefined;
      if (!schoolId) throw new Error("school_client_id obrigatório");
      if (!Array.isArray(rawEmails) || rawEmails.length === 0)
        throw new Error("Lista de emails vazia");

      const seen = new Set<string>();
      const valid: string[] = [];
      const invalid: string[] = [];
      for (const raw of rawEmails) {
        const e = String(raw || "").trim().toLowerCase();
        if (!e) continue;
        if (!EMAIL_RE.test(e)) { invalid.push(raw); continue; }
        if (seen.has(e)) continue;
        seen.add(e);
        valid.push(e);
      }

      const { data: existingProfiles } = await admin
        .from("profiles").select("user_id, email").in("email", valid);
      const emailToUser = new Map<string, string>();
      (existingProfiles || []).forEach((p) => {
        if (p.email) emailToUser.set(p.email.toLowerCase(), p.user_id);
      });

      const rows = valid.map((email) => ({
        school_client_id: schoolId,
        email,
        user_id: emailToUser.get(email) || null,
        added_by: userData.user.id,
      }));

      const { data: inserted, error: insErr } = await admin
        .from("school_premium_members")
        .upsert(rows, { onConflict: "email", ignoreDuplicates: false })
        .select();
      if (insErr) throw new Error(`Erro ao inserir membros: ${insErr.message}`);

      return new Response(
        JSON.stringify({
          inserted_count: inserted?.length || 0,
          linked_existing_users: emailToUser.size,
          invalid_emails: invalid,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
