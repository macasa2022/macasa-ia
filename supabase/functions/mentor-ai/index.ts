import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
- Destaca fórmulas com **negrito** ou blocos de código
- Usa listas numeradas para passos
- Inclui secções claras com títulos ##

Disciplinas: Matemática, Física, Química (7º-12º ano Portugal).
Quando não souberes algo, diz honestamente. Nunca inventes informação científica.`,
};

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

    const { messages, mode, exercise, year, subject } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt: string;
    let stream = true;
    let model = "google/gemini-2.5-flash";

    if (mode && mode.startsWith("solve_")) {
      systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.solve_resolve;
      stream = false; // JSON responses should not stream

      const context = `\n\nContexto: Ano escolar: ${year || "não especificado"}. Disciplina: ${subject || "não especificada"}.`;
      systemPrompt += context;

      const aiMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: exercise || messages?.[messages.length - 1]?.content || "" },
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages: aiMessages, stream: false }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Demasiados pedidos. Aguarda um momento." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI error:", status, t);
        return new Response(JSON.stringify({ error: "Erro na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";

      // Try to parse JSON from the response
      let parsed;
      try {
        // Remove potential markdown code blocks
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { raw: content };
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat mode - streaming
    systemPrompt = SYSTEM_PROMPTS.chat;
    if (year) systemPrompt += `\n\nO aluno está no ${year}.`;
    if (subject) systemPrompt += ` A disciplina é ${subject}.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: aiMessages, stream: true }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Demasiados pedidos. Aguarda um momento." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mentor-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
