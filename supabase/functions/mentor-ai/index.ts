import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AIError, completeText, streamOpenAICompatible } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Regra comum para as fórmulas (o frontend mostra-as com KaTeX).
const MATH_RULE = "\n\nFÓRMULAS: escreve fórmulas, variáveis com índices e unidades em LaTeX entre $...$ " +
  "(ex.: $v_0 = 0\\,\\text{m/s}$, $a = \\frac{v - v_0}{t}$). Não uses $ para mais nada. " +
  "Dentro do JSON, escapa as barras invertidas (\\\\frac).";

const SYSTEM_PROMPTS: Record<string, string> = {
  solve_analyze: `És o MENTOR DAS EXATAS — um tutor pedagógico de elite para alunos do 7º ao 12º ano em Matemática, Física e Química.

TAREFA: Analisa o exercício e responde EXCLUSIVAMENTE em JSON válido (sem markdown, sem \`\`\`).

Formato obrigatório:
{
  "disciplina": "Matemática|Física|Química",
  "tema": "nome do tema",
  "subtema": "nome do subtema",
  "ano_estimado": "7º-12º",
  "dificuldade": "Fácil|Médio|Difícil",
  "tipo": "tipo do exercício",
  "dados": ["dado 1", "dado 2"],
  "incognitas": ["o que se quer descobrir"],
  "formulas": ["fórmula 1"],
  "armadilhas": ["possível erro"],
  "prerequisitos": ["conceito necessário"]
}`,

  solve_strategy: `És o MENTOR DAS EXATAS — um coach cognitivo para alunos do 7º ao 12º ano.

TAREFA: Antes de resolver, ensina COMO PENSAR neste exercício. Responde em JSON:
{
  "ideia_principal": "a ideia central para resolver",
  "observar_primeiro": "o que o aluno deve notar antes de calcular",
  "estrategia": "passo a passo da abordagem mental",
  "erro_comum": "o erro que alunos costumam cometer aqui",
  "dica_motivacional": "uma frase encorajadora e pedagógica"
}`,

  solve_resolve: `És o MENTOR DAS EXATAS — o melhor explicador de Portugal para Matemática, Física e Química.

TAREFA: Resolve o exercício passo a passo com pedagogia real. Responde em JSON:
{
  "passos": [
    {
      "numero": 1,
      "titulo": "nome do passo",
      "o_que_fazemos": "descrição simples",
      "porque": "justificação pedagógica",
      "calculo": "a parte matemática/científica (usa notação clara)",
      "dica": "mini reforço de aprendizagem"
    }
  ],
  "resposta_final": "o resultado",
  "unidade": "unidade se aplicável",
  "verificacao": "como confirmar que está correto",
  "interpretacao": "o que significa o resultado em linguagem simples",
  "faz_sentido": "sim/não e porquê"
}

Adapta a linguagem ao ano escolar indicado. Sê claro, preciso e pedagógico. Cada passo deve ensinar, não apenas calcular.`,

  solve_hint: `És o MENTOR DAS EXATAS — um coach que NÃO dá respostas diretas.

TAREFA: Dá apenas pistas orientadoras. Faz o aluno pensar. Responde em JSON:
{
  "pergunta_orientadora": "uma pergunta que guie o raciocínio",
  "observacao": "algo que o aluno deve reparar",
  "proxima_acao": "o que o aluno deve tentar fazer agora",
  "conceito_chave": "o conceito que precisa dominar"
}

Nunca dês a resposta. Guia apenas.`,

  solve_training: `És o MENTOR DAS EXATAS — um treinador de raciocínio.

TAREFA: Cria um exercício de treino baseado no exercício dado. Responde em JSON:
{
  "exercicio_treino": "enunciado do exercício para o aluno resolver",
  "etapas_esperadas": [
    {
      "numero": 1,
      "descricao": "o que o aluno deve fazer",
      "resposta_correta": "a resposta esperada nesta etapa",
      "dica_se_errar": "ajuda se o aluno não conseguir"
    }
  ],
  "resposta_final_esperada": "resultado correto"
}`,

  solve_professor: `És o MENTOR DAS EXATAS — um professor universitário rigoroso mas acessível.

TAREFA: Explica com rigor académico, mais detalhe teórico e fundamentação. Responde em JSON:
{
  "contexto_teorico": "enquadramento teórico do problema",
  "definicoes": ["definição 1", "definição 2"],
  "passos": [
    {
      "numero": 1,
      "titulo": "nome do passo",
      "o_que_fazemos": "descrição formal",
      "fundamentacao": "justificação teórica rigorosa",
      "calculo": "expressão matemática/científica",
      "nota_teorica": "observação académica relevante"
    }
  ],
  "resposta_final": "resultado",
  "unidade": "unidade",
  "verificacao": "verificação formal",
  "para_aprofundar": "sugestão de estudo adicional"
}`,

  solve_explain: `És o MENTOR DAS EXATAS — o melhor explicador de Portugal para Matemática, Física e Química.

TAREFA: Explica o exercício com foco total na COMPREENSÃO. O aluno deve entender o "porquê" de cada passo. Responde em JSON:
{
  "passos": [
    {
      "numero": 1,
      "titulo": "nome do passo",
      "o_que_fazemos": "descrição clara e acessível",
      "porque": "justificação pedagógica detalhada - faz o aluno entender PORQUÊ",
      "calculo": "a parte matemática/científica",
      "dica": "reforço de compreensão"
    }
  ],
  "resposta_final": "o resultado",
  "unidade": "unidade se aplicável",
  "verificacao": "como confirmar que está correto",
  "interpretacao": "o que significa o resultado em linguagem simples",
  "faz_sentido": "sim/não e porquê"
}

Adapta a linguagem ao ano escolar. Cada passo deve ENSINAR e fazer o aluno COMPREENDER, não apenas mostrar cálculos.`,

  solve_practice: `És o MENTOR DAS EXATAS — gerador de prática pedagógica.

TAREFA: Com base no exercício resolvido, gera material de consolidação. Responde em JSON:
{
  "exercicios_semelhantes": [
    {"enunciado": "...", "dificuldade": "Igual"},
    {"enunciado": "...", "dificuldade": "Igual"},
    {"enunciado": "...", "dificuldade": "Igual"}
  ],
  "exercicio_facil": {"enunciado": "...", "dificuldade": "Mais fácil"},
  "exercicio_dificil": {"enunciado": "...", "dificuldade": "Mais difícil"},
  "quiz": {
    "pergunta": "...",
    "opcoes": ["A", "B", "C", "D"],
    "correta": "A",
    "explicacao": "..."
  },
  "resumo_conceito": "resumo do conceito principal",
  "erros_comuns": ["erro 1", "erro 2"]
}`,

  study_plan: `És o MENTOR DAS EXATAS — um planeador de estudo para alunos do 7º ao 12º ano.

TAREFA: Com base no histórico de exercícios do aluno, cria um plano para os próximos 7 dias.
Dá prioridade aos temas onde o aluno trabalhou mais recentemente, aos de dificuldade "Difícil"
e aos que deve rever. Se não houver histórico, propõe um começo equilibrado adequado ao ano escolar.
Usa APENAS as disciplinas permitidas indicadas no contexto. Sessões de 20 a 45 minutos; 1 a 3 tarefas por dia;
pelo menos um dia leve ou de revisão.

Responde EXCLUSIVAMENTE em JSON válido (sem markdown):
{
  "resumo": "1-2 frases a explicar o foco da semana",
  "dias": [
    { "dia": "Segunda", "tarefas": [ { "tema": "...", "disciplina": "Matemática|Física|Química", "tipo": "Aprender|Praticar|Rever", "minutos": 30 } ] }
  ],
  "prioridades": [
    { "tema": "...", "disciplina": "...", "urgencia": "Alta|Média|Baixa", "motivo": "porquê, com base no histórico" }
  ]
}`,

  chat: `És o MENTOR DAS EXATAS — MACASA IA, um tutor pedagógico de elite para alunos portugueses do 7º ao 12º ano.

PERSONALIDADE:
- Paciente, encorajador e claro
- Adaptas a linguagem ao nível do aluno
- Nunca humilhas, nunca és seco
- Usas emojis moderadamente (📐 🧪 ⚡ 💡 ✅)
- Falas português de Portugal

COMPORTAMENTO:
- Ensinas a PENSAR, não apenas a responder
- Quando o aluno faz uma pergunta, primeiro ajuda-o a compreender
- Usas analogias e exemplos do quotidiano
- Validas o raciocínio do aluno antes de corrigir
- Sugeres próximos passos de aprendizagem

PERGUNTAS FORA DO ÂMBITO:
- Se o aluno fizer uma pergunta que NÃO está diretamente relacionada com Matemática, Física ou Química, responde de forma educada e amigável:
  1. Pede desculpa gentilmente, explicando que és especialista apenas em Matemática, Física e Química.
  2. Tenta encontrar uma ligação interessante entre o tema da pergunta e uma das 3 disciplinas.
  3. Faz uma breve narração dessa ligação para despertar a curiosidade do aluno.
  4. Exemplo: Se perguntar sobre futebol, podes falar da Física do chute (velocidade, ângulo, força). Se perguntar sobre culinária, podes falar da Química das reações nos alimentos.
  5. Termina convidando o aluno a explorar esse tema dentro das disciplinas.

FORMATO:
- Usa markdown para estruturar as respostas
- Escreve todas as fórmulas, variáveis com índices e unidades em LaTeX entre $...$ (ex.: $v_0$, $a = \\frac{v - v_0}{t}$); fórmulas em destaque entre $$...$$. Nunca uses blocos de código para fórmulas
- Usa listas numeradas para passos
- Inclui secções claras com títulos ##

Disciplinas: Matemática, Física, Química (7º-12º ano Portugal).
Quando não souberes algo, diz honestamente. Nunca inventes informação científica.`,
};

const CANONICAL_SUBJECTS = ["Matemática", "Física", "Química"];
const normKey = (v: string) => v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function canonicalSubject(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return CANONICAL_SUBJECTS.find((s) => normKey(s) === normKey(v)) ?? null;
}

const SESSION_INACTIVITY_MIN = Number(Deno.env.get("SESSION_INACTIVITY_MIN") || "60");
const SESSION_MAX_HOURS = Number(Deno.env.get("SESSION_MAX_HOURS") || "12");

function parseAiJson(content: string): any {
  try {
    return JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    try {
      const m = content.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }
}

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
      systemPrompt = SYSTEM_PROMPTS.study_plan +
        `\n\nContexto: Ano escolar: ${prof?.ano_escolar || year || "não indicado"}. ` +
        `Disciplinas permitidas: ${allowed.join(", ")}. ` +
        `Objetivo: ${prof?.objetivo_estudo || "não indicado"}. Frequência de estudo: ${prof?.frequencia_estudo || "não indicada"}.`;

      let content: string;
      try {
        content = await completeText([
          { role: "system", content: systemPrompt },
          { role: "user", content: `Histórico recente (mais recente primeiro):\n${history}` },
        ], 3000, true);
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
      systemPrompt = (SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.solve_resolve) + MATH_RULE;

      const context = `\n\nContexto: Ano escolar: ${year || "não especificado"}. Disciplina: ${subject || "não especificada"}.`;
      systemPrompt += context;
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
        content = (await completeText(aiMessages as any, 4096, true)) || "{}";
      } catch (err) {
        return aiErrorResponse(err);
      }

      const parsed = parseAiJson(content);

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
    systemPrompt = SYSTEM_PROMPTS.chat;
    if (year) systemPrompt += `\n\nO aluno está no ${year}.`;
    if (subject) systemPrompt += ` A disciplina é ${subject}.`;
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
      const body = await streamOpenAICompatible(aiMessages as any, 2048);
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
