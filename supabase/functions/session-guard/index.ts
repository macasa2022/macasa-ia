import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendEmail } from "../_shared/send-email.ts";

// Uma sessão ativa por conta, com transferência segura entre dispositivos.
//
// Ações (POST JSON { action, device_id, device_label?, force?, active? }):
//  - claim         : depois do login. Se outra sessão estiver ativa noutro navegador,
//                    devolve "conflict" (o aluno escolhe transferir). Com force=true transfere.
//  - heartbeat     : de 5 em 5 min. active=false quando o aluno está inativo (não renova).
//  - release       : ao terminar sessão.
//  - revoke_others : "terminar as outras sessões" (Definições → Sessões).
//
// Regras: expira após INACTIVITY_MIN sem atividade ou MAX_HOURS desde o início (controlado aqui,
// no servidor). Mudar de rede/IP não conta. Escrever o email ou falhar a palavra-passe nunca chega
// aqui (só há claim depois de um login válido). Nunca suspende automaticamente: a suspensão é manual.

const INACTIVITY_MIN = Number(Deno.env.get("SESSION_INACTIVITY_MIN") || "60");
const MAX_HOURS = Number(Deno.env.get("SESSION_MAX_HOURS") || "12");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type SessionRow = { user_id: string; device_id: string; device_label: string | null; started_at: string; last_seen: string };

function isFresh(row: SessionRow, now = Date.now()) {
  return now - new Date(row.last_seen).getTime() < INACTIVITY_MIN * 60_000 &&
    now - new Date(row.started_at).getTime() < MAX_HOURS * 3_600_000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
    const jwt = authHeader.replace("Bearer ", "");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const deviceId = typeof body.device_id === "string" ? body.device_id.slice(0, 64) : "";
    const deviceLabel = typeof body.device_label === "string" ? body.device_label.slice(0, 80) : null;
    if (!deviceId) return json({ error: "device_id obrigatório" }, 400);

    const logEvent = (kind: string) =>
      admin.from("session_events").insert({ user_id: user.id, kind, device_id: deviceId, device_label: deviceLabel });

    // Conta suspensa (decisão manual de um admin)
    const { data: suspension } = await admin.from("account_suspensions").select("reason").eq("user_id", user.id).maybeSingle();
    if (suspension) return json({ status: "suspended", reason: suspension.reason });

    // Administradores podem usar vários dispositivos
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (isAdmin) return json({ status: "ok", exempt: true });

    const { data: row } = await admin.from("active_sessions").select("*").eq("user_id", user.id).maybeSingle<SessionRow>();
    const nowIso = new Date().toISOString();

    const takeSession = async (kind: "login" | "transfer") => {
      await admin.from("active_sessions").upsert({
        user_id: user.id, device_id: deviceId, device_label: deviceLabel, started_at: nowIso, last_seen: nowIso,
      });
      await logEvent(kind);
      await rememberDevice();
    };

    // Aviso por email quando aparece um navegador/dispositivo novo (não no primeiro de todos)
    const rememberDevice = async () => {
      const { data: known } = await admin.from("known_devices").select("device_id").eq("user_id", user.id);
      const isNew = !(known || []).some((d) => d.device_id === deviceId);
      await admin.from("known_devices").upsert({
        user_id: user.id, device_id: deviceId, device_label: deviceLabel, last_seen: nowIso,
      });
      if (isNew && (known || []).length > 0 && user.email) {
        const site = Deno.env.get("SITE_URL") || "";
        const text =
          `Foi detetado um novo acesso à tua conta MACASA IA${deviceLabel ? ` (${deviceLabel})` : ""}.\n\n` +
          `Se foste tu, podes continuar normalmente. Se não reconheces este acesso, termina as sessões ` +
          `desconhecidas e altera a tua palavra-passe${site ? ` em ${site}/settings#seguranca` : " nas Definições → Sessões e segurança"}.\n\n` +
          `A conta é pessoal e a partilha não é permitida.`;
        try {
          await sendEmail({
            to: user.email,
            from: "MACASA IA <noreply@logicpathways.online>",
            subject: "Novo acesso à tua conta MACASA IA",
            text,
            html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">` +
              text.split("\n\n").map((p) => `<p>${p}</p>`).join("") + `</div>`,
          });
        } catch (e) {
          console.error("[session-guard] aviso por email falhou:", e);
        }
      }
    };

    // ---------------- CLAIM ----------------
    if (action === "claim") {
      if (row && row.device_id === deviceId) {
        await admin.from("active_sessions").update({ last_seen: nowIso, device_label: deviceLabel ?? row.device_label }).eq("user_id", user.id);
        return json({ status: "ok" });
      }
      if (row && isFresh(row) && !body.force) {
        return json({ status: "conflict", other: { device_label: row.device_label, last_seen: row.last_seen } });
      }
      const transferring = !!row && isFresh(row);
      if (transferring) {
        // Termina efetivamente a sessão anterior (revoga as outras sessões desta conta)
        const { error } = await admin.auth.admin.signOut(jwt, "others");
        if (error) console.error("[session-guard] signOut others:", error);
      }
      await takeSession(transferring ? "transfer" : "login");
      return json({ status: "ok", transferred: transferring });
    }

    // ---------------- HEARTBEAT ----------------
    if (action === "heartbeat") {
      if (!row) {
        await takeSession("login");
        return json({ status: "ok" });
      }
      if (row.device_id !== deviceId) return json({ status: "replaced", other: { device_label: row.device_label } });
      if (!isFresh(row)) {
        await admin.from("active_sessions").delete().eq("user_id", user.id);
        await logEvent("expired");
        return json({ status: "expired" });
      }
      if (body.active !== false) {
        await admin.from("active_sessions").update({ last_seen: nowIso }).eq("user_id", user.id);
      }
      return json({ status: "ok" });
    }

    // ---------------- RELEASE ----------------
    if (action === "release") {
      if (row && row.device_id === deviceId) {
        await admin.from("active_sessions").delete().eq("user_id", user.id);
        await logEvent("logout");
      }
      return json({ status: "ok" });
    }

    // ---------------- REVOKE OTHERS ----------------
    if (action === "revoke_others") {
      const { error } = await admin.auth.admin.signOut(jwt, "others");
      if (error) console.error("[session-guard] signOut others:", error);
      await admin.from("active_sessions").upsert({
        user_id: user.id, device_id: deviceId, device_label: deviceLabel, started_at: row && row.device_id === deviceId ? row.started_at : nowIso, last_seen: nowIso,
      });
      await logEvent("revoke_others");
      return json({ status: "ok" });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[session-guard]", e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
