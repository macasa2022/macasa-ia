import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AIError, completeText, streamOpenAICompatible } from "../_shared/ai.ts";
import { CHAT_MAX_TOKENS, LANG_RULE, SOLVE_MAX_TOKENS, STUDY_PLAN_MAX_TOKENS, SYSTEM_PROMPTS, chatSystemPrompt, solveSystemPrompt } from "../_shared/prompts.ts";
import { cleanPractice, parseAiJson } from "../_shared/ai-json.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


const CANONICAL_SUBJECTS = ["Matemática", "Física", "Química"];
const normKey = (v: string) => v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function canonicalSubject(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return CANONICAL_SUBJECTS.find((s) => normKey(s) === normKey(v)) ?? null;
}

const SESSION_INACTIVITY_MIN = Number(Deno.env.get("SESSION_INACTIVITY_MIN") || "60");
const SESSION_MAX_HOURS = Number(Deno.env.get("SESSION_MAX_HOURS") || "12");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function aiErrorResponse(err: unknown) {
  const json = (error: string, status: number) =>
    new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (err instanceof AIError) {
    if (err.status === 429) return json("Demasiados pedidos. Aguarda um momento.", 429);
    if (err.status === 402) return json("Créditos esgotados.", 402);
    if (err.status === 503) return json("A IA local não está disponível. Confirma que o Ollama está aberto.", 503);
  }
  console.error("AI error:", err);
  return json("Erro na IA", 500);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SERVER-SIDE QUOTA ENFORCEMENT (defense in depth)
    // Use service role to read roles + usage without RLS interference
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: isAdminData } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const isAdmin = !!isAdminData;

    const body = await req.json();
    const { messages, mode, exercise, imageBase64 } = body;
    let year: string | undefined = body.year;
    let subject: string | undefined = body.subject;

    // CONTA SUSPENSA (decisão manual de um admin)
    const { data: suspension } = await adminClient
      .from("account_suspensions").select("reason").eq("user_id", user.id).maybeSingle();
    if (suspension) {
      return jsonResponse({ error: "A tua conta está suspensa. Contacta o suporte.", code: "suspended" }, 403);
    }

    // UMA SESSÃO ATIVA: se a conta estiver ativa noutro navegador, este não usa a IA
    if (!isAdmin) {
      const deviceId = req.headers.get("x-device-id") || "";
      const { data: sess } = await adminClient
        .from("active_sessions").select("device_id, last_seen, started_at").eq("user_id", user.id).maybeSingle();
      if (sess && sess.device_id !== deviceId) {
        const now = Date.now();
        const fresh = now - new Date(sess.last_seen).getTime() < SESSION_INACTIVITY_MIN * 60_000 &&
          now - new Date(sess.started_at).getTime() < SESSION_MAX_HOURS * 3_600_000;
        if (fresh) {
          return jsonResponse({
            error: "A tua conta está ativa noutro dispositivo. Transfere a sessão para este dispositivo para continuar.",
            code: "session_elsewhere",
          }, 409);
        }
      }
    }

    // PREMIUM? admin, escola, atribuído pelo admin, ou pago (última confirmação do Stripe < 24 h)
    let isPremiumUser = isAdmin;
    if (!isPremiumUser) {
      const { data: premiumNonStripe } = await adminClient.rpc("is_premium_user", { _user_id: user.id });
      isPremiumUser = !!premiumNonStripe;
    }
    if (!isPremiumUser) {
      const { data: cache } = await adminClient
        .from("stripe_premium_cache").select("premium, checked_at").eq("user_id", user.id).maybeSingle();
      isPremiumUser = !!cache?.premium && Date.now() - new Date(cache.checked_at).getTime() < 24 * 3_600_000;
    }

    // PLANO GRATUITO: disciplina inscrita (verificada aqui, no servidor)
    let enrolledSubject: string | null = null;
    if (!isPremiumUser) {
      const { data: prof } = await adminClient
        .from("profiles").select("disciplinas_favoritas, ano_escolar").eq("user_id", user.id).maybeSingle();
      // O ano escolar do plano gratuito é o do perfil (o que vem do browser é ignorado).
      if (prof?.ano_escolar) year = prof.ano_escolar;
      enrolledSubject = (prof?.disciplinas_favoritas || []).map(canonicalSubject).find(Boolean) ?? null;
      if (!enrolledSubject) {
        return jsonResponse({ error: "Configura a tua disciplina nas Definições para continuar.", code: "no_subject" }, 403);
      }
      subject = enrolledSubject; // o contexto passa a ser sempre a disciplina inscrita
    }

    // LIMITE DO PLANO GRATUITO (aplicado aqui, no servidor):
    // 5 perguntas e depois 20h de espera. Os vários passos de um mesmo exercício
    // (mesmo session_id) contam como uma única pergunta.
    if (!isPremiumUser) {
      const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 64) : null;
      const { data: quota, error: quotaError } = await adminClient.rpc("consume_question", {
        _user_id: user.id,
        _session: sessionId,
      });
      if (quotaError) console.error("consume_question error:", quotaError);
      const row = Array.isArray(quota) ? quota[0] : quota;
      if (row && row.ok === false) {
        // Pode ter Premium pago recente (Stripe) — confirmar antes de bloquear
        const { data: premiumCheck } = await adminClient.functions.invoke("check-subscription", {
          headers: { Authorization: authHeader },
        });
        if (!premiumCheck?.subscribed) {
          return jsonResponse({
            error: "Atingiste o limite de perguntas. Aguarda o fim do período de espera ou faz upgrade para Premium.",
            cooldown_until: row.cooldown_ends,
          }, 429);
        }
        isPremiumUser = true;
        enrolledSubject = null;
      }
    }

    const restriction = enrolledSubject
      ? `\n\nRESTRIÇÃO DO PLANO: o aluno está no plano gratuito e só tem acesso a ${enrolledSubject}.`
      : "";

    let systemPrompt: string;

    // ---------------- PLANO DE ESTUDO ----------------
    if (mode === "study_plan") {
      const [{ data: attempts }, { data: prof }] = await Promise.all([
        adminClient.from("exercise_attempts")
          .select("subject, topic, difficulty, mode, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
        adminClient.from("profiles")
          .select("ano_escolar, objetivo_estudo, frequencia_estudo").eq("user_id", user.id).maybeSingle(),
      ]);
      const allowed = enrolledSubject ? [enrolledSubject] : CANONICAL_SUBJECTS;
      const history = (attempts || []).length
        ? (attempts || []).map((a) =>
          `- ${a.created_at.slice(0, 10)} · ${a.subject || "?"} · ${a.topic || "sem tema"} · ${a.difficulty || "?"}`).join("\n")
        : "(sem exercícios resolvidos ainda)";
      systemPrompt = SYSTEM_PROMPTS.study_plan + LANG_RULE +
        `\n\nContexto: Ano escolar: ${prof?.ano_escolar || year || "não indicado"}. ` +
        `Disciplinas permitidas: ${allowed.join(", ")}. ` +
        `Objetivo: ${prof?.objetivo_estudo || "não indicado"}. Frequência de estudo: ${prof?.frequencia_estudo || "não indicada"}.`;

      let content: string;
      try {
        content = await completeText([
          { role: "system", content: systemPrompt },
          { role: "user", content: `Histórico recente (mais recente primeiro):\n${history}` },
        ], STUDY_PLAN_MAX_TOKENS, true);
      } catch (err) {
        return aiErrorResponse(err);
      }
      const plan = parseAiJson(content);
      if (!Array.isArray(plan?.dias)) return jsonResponse({ error: "Não foi possível gerar o plano. Tenta novamente." }, 502);

      // Normalizar: ids únicos, só disciplinas permitidas
      plan.dias = plan.dias.slice(0, 7).map((d: any, i: number) => ({
        dia: String(d?.dia || `Dia ${i + 1}`),
        tarefas: (Array.isArray(d?.tarefas) ? d.tarefas : []).slice(0, 4).map((t: any, j: number) => ({
          id: `d${i}-t${j}`,
          tema: String(t?.tema || "Revisão"),
          disciplina: allowed.includes(canonicalSubject(t?.disciplina) || "") ? canonicalSubject(t?.disciplina) : allowed[0],
          tipo: ["Aprender", "Praticar", "Rever"].includes(t?.tipo) ? t.tipo : "Praticar",
          minutos: Math.min(90, Math.max(10, Number(t?.minutos) || 30)),
        })),
      }));
      plan.prioridades = (Array.isArray(plan.prioridades) ? plan.prioridades : []).slice(0, 5).map((p: any) => ({
        tema: String(p?.tema || ""),
        disciplina: canonicalSubject(p?.disciplina) || allowed[0],
        urgencia: ["Alta", "Média", "Baixa"].includes(p?.urgencia) ? p.urgencia : "Média",
        motivo: String(p?.motivo || ""),
      })).filter((p: any) => p.tema);
      plan.resumo = typeof plan.resumo === "string" ? plan.resumo : "";

      const { data: saved, error: saveError } = await adminClient
        .from("study_plans").insert({ user_id: user.id, plan }).select().single();
      if (saveError) {
        console.error("study_plans insert:", saveError);
        return jsonResponse({ error: "Erro ao guardar o plano." }, 500);
      }
      return jsonResponse(saved);
    }

    if (mode && mode.startsWith("solve_")) {
      systemPrompt = solveSystemPrompt(mode, year, subject);
      if (enrolledSubject) {
        systemPrompt += restriction +
          ` Se o exercício NÃO for de ${enrolledSubject}, ignora o formato acima e responde APENAS com o JSON ` +
          `{"fora_da_disciplina": true, "disciplina_detetada": "<disciplina do exercício>"}.`;
      }

      const exerciseText = exercise || messages?.[messages.length - 1]?.content || "";

      // Build user content - support image + text
      let userContent: any;
      if (imageBase64) {
        userContent = [
          { type: "text", text: exerciseText || "Analisa este exercício da imagem." },
          { type: "image_url", image_url: { url: imageBase64 } },
        ];
      } else {
        userContent = exerciseText;
      }

      const aiMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ];

      let content: string;
      try {
        content = (await completeText(aiMessages as any, SOLVE_MAX_TOKENS, true)) || "{}";
      } catch (err) {
        return aiErrorResponse(err);
      }

      const parsed = parseAiJson(content);
      if (mode === "solve_practice" && cleanPractice(parsed)) console.warn("[IA] quiz incoerente removido");

      if (enrolledSubject && parsed?.fora_da_disciplina) {
        const detected = canonicalSubject(parsed.disciplina_detetada) || parsed.disciplina_detetada || "outra disciplina";
        return jsonResponse({
          error: `No plano gratuito só podes resolver exercícios de ${enrolledSubject}. Este exercício parece ser de ${detected}.`,
          code: "wrong_subject",
        }, 403);
      }

      return jsonResponse(parsed);
    }

    // Chat mode - streaming
    systemPrompt = chatSystemPrompt(year, subject);
    if (enrolledSubject) {
      systemPrompt += restriction +
        ` Se a pergunta for claramente de outra disciplina, não a resolvas: explica com simpatia que o plano gratuito ` +
        `inclui apenas ${enrolledSubject} e que pode pedir mudança de disciplina ou passar a Premium.`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    try {
      const body = await streamOpenAICompatible(aiMessages as any, CHAT_MAX_TOKENS);
      return new Response(body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } catch (err) {
      return aiErrorResponse(err);
    }
  } catch (e) {
    console.error("mentor-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
