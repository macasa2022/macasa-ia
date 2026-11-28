/**
 * Avaliação dos modelos de IA do MACASA IA — um só comando, relatório completo.
 *
 *   npm run avaliar:modelos                      → todos os modelos do Ollama (exceto embeddings)
 *   npm run avaliar:modelos -- --modelos gemma4:e2b,qwen3.5:4b-q4_K_M
 *   npm run avaliar:modelos -- --claude          → inclui o Claude (ANTHROPIC_* do .env; é pago)
 *   npm run avaliar:modelos -- --repeticoes 3    → repete cada exercício 3 vezes (apanha falhas ocasionais)
 *   npm run avaliar:modelos -- --pensar ambos    → cada modelo com o modo "pensar" desligado E ligado
 *                                                  (sim | nao | ambos; por omissão o OLLAMA_THINK do .env)
 *
 * Usa os MESMOS prompts, limites de tokens e fluxo da aplicação (Resolver em 4 passos:
 * análise → estratégia → resolução → prática; Tutor em streaming), medindo cada passo.
 * Resultado: relatorios-modelos/<data>.md (para ler) e .json (dados brutos).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHAT_MAX_TOKENS, JSON_GEN_OPTIONS, RETRY_RULE, SOLVE_MAX_TOKENS, chatSystemPrompt, solveSystemPrompt,
} from "../supabase/functions/_shared/prompts.ts";
import { cleanPractice, parseAiJson, ptPtFix } from "../supabase/functions/_shared/ai-json.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMITE_APP_S = 400; // limite por pedido das Edge Functions locais (Supabase CLI)

// ---------- configuração ----------
function lerEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const linha of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const ENV = lerEnv(join(ROOT, "supabase", "functions", ".env"));
const OLLAMA = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/+$/, "");
const NUM_CTX = Number(ENV.OLLAMA_NUM_CTX || 8192);
const THINK = (ENV.OLLAMA_THINK || "false").toLowerCase() === "true";

const args = process.argv.slice(2);
const arg = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const COM_CLAUDE = args.includes("--claude");
const REPETICOES = Math.max(1, Math.min(10, Number(arg("--repeticoes") || 1) || 1));
const PENSAR_ARG = (arg("--pensar") || "").toLowerCase();
const MODOS_PENSAR: boolean[] = PENSAR_ARG === "ambos" ? [false, true] : PENSAR_ARG === "sim" ? [true] : PENSAR_ARG === "nao" || PENSAR_ARG === "não" ? [false] : [THINK];
const DESCRICAO_PENSAR = MODOS_PENSAR.length === 2 ? "desligado e ligado (comparação)" : MODOS_PENSAR[0] ? "ligado" : "desligado";

// ---------- casos de teste ----------
type Caso = {
  id: string; titulo: string; disciplina: string; ano: string;
  enunciado: string; imagem?: string; certo: (texto: string) => boolean; criterio: string;
};
const FOTO = join(ROOT, "scripts", "avaliacao", "exercicio-foto.png");
const CASOS: Caso[] = [
  {
    id: "mat", titulo: "Resolver — Matemática (equação do 2.º grau)", disciplina: "Matemática", ano: "10º ano",
    enunciado: "Resolve a equação x^2 + 6x + 5 = 0",
    certo: (t) => /=\s*[−-]\s*1\b/.test(t) && /=\s*[−-]\s*5\b/.test(t), criterio: "soluções −1 e −5",
  },
  {
    id: "fis", titulo: "Resolver — Física (aceleração)", disciplina: "Física", ano: "9º ano",
    enunciado: "Um carro acelera de 0 a 20 m/s em 5 segundos. Calcula a aceleração.",
    certo: (t) => /=\s*4\s*,?\s*m\s*\/\s*s/.test(t), criterio: "a = 4 m/s²",
  },
  {
    id: "foto", titulo: "Resolver — exercício por foto", disciplina: "Matemática", ano: "8º ano",
    enunciado: "", imagem: FOTO,
    certo: (t) => /x\s*=\s*6\b/.test(t), criterio: "x = 6 (imagem: 3x − 7 = 11)",
  },
];
const PERGUNTA_TUTOR = "Qual a diferença entre velocidade e aceleração?";

// ---------- sinais de qualidade ----------
const PT_BR = ["você", "vocês", "ônibus", "tela", "arquivo", "equipe", "trem", "celular", "a gente", "registro", "planejar", "planejamento", "usuário", "contato", "fato de", "econômico", "Bhaskara", "trinômio", "polinômio", "Resolva", "Lembre-se", "Calcule", "frear", "fazendo", "estando"];
const PT_PT = ["tu ", "estás", "podes", "autocarro", "ecrã", "ficheiro", "equipa", "comboio", "telemóvel", "registo", "planear", "utilizador", "contacto", "facto", "económico", "fórmula resolvente"];
function contarMarcas(texto: string, marcas: string[]) {
  const t = ` ${texto.toLowerCase()} `;
  return marcas.filter((m) => t.includes(m.toLowerCase()));
}
function latexEstragado(texto: string) {
  // restos típicos de barras não escapadas: tabulação, form feed, backspace, ou "ext{" / "rac{" sem barra
  return /[\t\f\b]/.test(texto) || /(^|[^\\a-z])(ext|rac|imes|eq)\{/.test(texto) || temCiclo(texto) ||
    /sqrt\(|\+\/-/.test(texto); // fórmulas em texto simples em vez de LaTeX
}
/** Ciclo: o mesmo pedaço curto repetido muitas vezes seguidas (ex.: "\text{ \text{ \text{"). */
function temCiclo(texto: string) {
  return /(.{2,20}?)\1{8,}/s.test(texto);
}

// ---------- chamadas ----------
type Medida = {
  passo: string; segundos: number; tokens?: number; tokS?: number; promptTokens?: number;
  fim?: string; jsonValido?: boolean; primeiroTokenS?: number; erro?: string; texto: string; pensamentoCar?: number;
  novaTentativa?: boolean; jsonValido1?: boolean;
};

// think: undefined = modelo sem modo pensar (não se envia o parâmetro)
async function ollamaChat(modelo: string, think: boolean | undefined, system: string, user: string, imagemB64?: string, json = true): Promise<Medida> {
  const t0 = performance.now();
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo, stream: false, ...(json ? { format: "json" } : {}),
      ...(think !== undefined ? { think } : {}), keep_alive: "10m",
      options: { num_ctx: NUM_CTX, num_predict: SOLVE_MAX_TOKENS, ...(json ? JSON_GEN_OPTIONS : {}) },
      messages: [{ role: "system", content: system }, { role: "user", content: user, ...(imagemB64 ? { images: [imagemB64] } : {}) }],
    }),
  });
  const segundos = (performance.now() - t0) / 1000;
  if (!r.ok) return { passo: "", segundos, erro: `${r.status} ${await r.text()}`, texto: "" };
  const d = await r.json();
  const texto: string = d?.message?.content ?? "";
  const parsed = json ? parseAiJson(texto) : null;
  return {
    passo: "", segundos, tokens: d.eval_count, promptTokens: d.prompt_eval_count, fim: d.done_reason,
    tokS: d.eval_count && d.eval_duration ? d.eval_count / (d.eval_duration / 1e9) : undefined,
    jsonValido: json ? !!parsed && !parsed.raw : undefined, texto, pensamentoCar: (d?.message?.thinking || "").length,
  };
}

async function ollamaTutor(modelo: string, think: boolean | undefined, system: string, pergunta: string): Promise<Medida> {
  const t0 = performance.now();
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo, stream: true, ...(think !== undefined ? { think } : {}), keep_alive: "10m",
      options: { num_ctx: NUM_CTX, num_predict: CHAT_MAX_TOKENS },
      messages: [{ role: "system", content: system }, { role: "user", content: pergunta }],
    }),
  });
  if (!r.ok || !r.body) return { passo: "Tutor", segundos: (performance.now() - t0) / 1000, erro: `${r.status} ${await r.text()}`, texto: "" };
  const reader = r.body.getReader(); const dec = new TextDecoder();
  let buf = "", texto = "", pensamento = 0, primeiro: number | undefined, fim: any = {};
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const linha = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!linha) continue;
      const c = JSON.parse(linha);
      const parte = c?.message?.content;
      pensamento += (c?.message?.thinking || "").length;
      if (parte) { if (primeiro === undefined) primeiro = (performance.now() - t0) / 1000; texto += parte; }
      if (c.done) fim = c;
    }
  }
  return {
    passo: "Tutor", segundos: (performance.now() - t0) / 1000, primeiroTokenS: primeiro, texto, pensamentoCar: pensamento,
    tokens: fim.eval_count, promptTokens: fim.prompt_eval_count, fim: fim.done_reason,
    tokS: fim.eval_count && fim.eval_duration ? fim.eval_count / (fim.eval_duration / 1e9) : undefined,
  };
}

async function claudeChat(system: string, user: string, imagemB64?: string, maxTokens = SOLVE_MAX_TOKENS, json = true): Promise<Medida> {
  const t0 = performance.now();
  const content: any = imagemB64
    ? [{ type: "image", source: { type: "base64", media_type: "image/png", data: imagemB64 } }, { type: "text", text: user || "Analisa este exercício da imagem." }]
    : user;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ENV.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: ENV.ANTHROPIC_MODEL || "claude-opus-5-5", max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  const segundos = (performance.now() - t0) / 1000;
  if (!r.ok) return { passo: "", segundos, erro: `${r.status} ${await r.text()}`, texto: "" };
  const d = await r.json();
  const texto = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const parsed = json ? parseAiJson(texto) : null;
  return {
    passo: "", segundos, tokens: d.usage?.output_tokens, promptTokens: d.usage?.input_tokens, fim: d.stop_reason,
    tokS: d.usage?.output_tokens ? d.usage.output_tokens / segundos : undefined,
    jsonValido: json ? !!parsed && !parsed.raw : undefined, texto,
  };
}

// Tira a "roupa" do LaTeX para verificar a resposta: \text{m/s} -> m/s, $x = 6$ -> x = 6.
const normalizar = (t: string) =>
  t.replace(/\\+(text|mathrm|mbox)?/g, " ").replace(/[{}$]/g, "").replace(/\s+/g, " ");

// Igual ao SolvePage: resumo da análise enviado aos passos seguintes.
const juntar = (v: unknown) => (Array.isArray(v) ? v.map(String).join(", ") : v ? String(v) : "N/A");
function contextoDaAnalise(a: any, enunciado: string) {
  return a && !a.raw
    ? `[Exercício analisado] Disciplina: ${a.disciplina || "N/A"}, Tema: ${a.tema || "N/A"}, Subtema: ${a.subtema || "N/A"}, Dados: ${juntar(a.dados)}, Incógnitas: ${juntar(a.incognitas)}, Fórmulas: ${juntar(a.formulas)}. Enunciado original: ${enunciado || "(imagem)"}`
    : enunciado;
}

// ---------- execução por modelo ----------
type ResultadoCaso = { caso: string; titulo: string; passos: Medida[]; totalS: number; certo: boolean; criterio: string; quizRejeitado: boolean; ciclo: boolean };
type Resultado = {
  modelo: string; fornecedor: "ollama" | "anthropic"; capacidades: string[]; gpuPct?: number; tamanhoGB?: number;
  cargaS?: number; casos: ResultadoCaso[]; tutor?: Medida; erro?: string;
};

async function capacidades(modelo: string): Promise<string[]> {
  const r = await fetch(`${OLLAMA}/api/show`, { method: "POST", body: JSON.stringify({ model: modelo }) });
  return r.ok ? ((await r.json()).capabilities || []) : [];
}

async function descarregarTodos() {
  const r = await fetch(`${OLLAMA}/api/ps`); if (!r.ok) return;
  for (const m of (await r.json()).models || []) {
    await fetch(`${OLLAMA}/api/generate`, { method: "POST", body: JSON.stringify({ model: m.name, keep_alive: 0 }) });
  }
}

async function avaliarCaso(caso: Caso, chamar: (system: string, user: string, img?: string) => Promise<Medida>, rep = 1): Promise<ResultadoCaso> {
  const img = caso.imagem ? readFileSync(caso.imagem).toString("base64") : undefined;
  const passos: Medida[] = [];
  const passo = async (nome: string, modo: string, user: string, comImagem = false) => {
    process.stdout.write(`      · ${nome}… `);
    // Igual à app (jsonComNovaTentativa): se o JSON vier inválido, nova tentativa com a RETRY_RULE.
    const sys = solveSystemPrompt(modo, caso.ano, caso.disciplina);
    const m1 = await chamar(sys, user, comImagem ? img : undefined);
    let m = m1;
    if (!m1.erro && m1.jsonValido === false) {
      const m2 = await chamar(sys + RETRY_RULE, user, comImagem ? img : undefined);
      m = { ...m2, segundos: m1.segundos + m2.segundos, tokens: (m1.tokens || 0) + (m2.tokens || 0), novaTentativa: true, jsonValido1: false,
        texto: m2.texto, pensamentoCar: (m1.pensamentoCar || 0) + (m2.pensamentoCar || 0) };
      m.erro = m2.erro;
      (m as any).texto1 = m1.texto;
    }
    if (m.jsonValido) m.texto = JSON.stringify(ptPtFix(parseAiJson(m.texto))); // o que o aluno vê (com a correção PT-PT)
    m.passo = nome; passos.push(m);
    console.log(m.erro ? `ERRO ${m.erro.slice(0, 120)}` : `${m.segundos.toFixed(1)} s, ${m.tokens ?? "?"} tokens${m.tokS ? `, ${m.tokS.toFixed(1)} tok/s` : ""}${m.fim === "length" ? " (CORTADO no limite de tokens)" : ""}${m.novaTentativa ? ` · JSON inválido à 1.ª → nova tentativa ${m.jsonValido ? "resolveu" : "FALHOU"}` : ""}`);
    return m;
  };
  const analise = await passo("Análise", "solve_analyze", caso.enunciado || "Analisa este exercício da imagem.", true);
  const ctx = contextoDaAnalise(parseAiJson(analise.texto), caso.enunciado);
  await passo("Estratégia", "solve_strategy", ctx);
  const resolucao = await passo("Resolução", "solve_resolve", ctx);
  const pratica = await passo("Prática", "solve_practice", ctx);
  return {
    caso: caso.id, titulo: REPETICOES > 1 ? `${caso.titulo} (#${rep})` : caso.titulo, passos, criterio: caso.criterio,
    ciclo: passos.some((p) => temCiclo(p.texto) || temCiclo(String((p as any).texto1 || ""))),
    quizRejeitado: cleanPractice(parseAiJson(pratica.texto)),
    totalS: passos.reduce((s, p) => s + p.segundos, 0),
    certo: caso.certo(normalizar(JSON.stringify(parseAiJson(resolucao.texto)) + " " + resolucao.texto)),
  };
}

async function avaliarOllama(modelo: string, pensar: boolean): Promise<Resultado | null> {
  const caps = await capacidades(modelo);
  const temThinking = caps.includes("thinking");
  if (pensar && !temThinking) { console.log(`   (sem modo pensar: ignorado com --pensar)`); return null; }
  const think = temThinking ? pensar : undefined;
  const nome = temThinking && MODOS_PENSAR.length === 2 ? `${modelo} · pensar ${pensar ? "ligado" : "desligado"}` : modelo;
  const res: Resultado = { modelo: nome, fornecedor: "ollama", capacidades: caps, casos: [] };
  try {
    await descarregarTodos();
    process.stdout.write("   carregar modelo… ");
    const t0 = performance.now();
    const g = await fetch(`${OLLAMA}/api/generate`, { method: "POST", body: JSON.stringify({ model: modelo, prompt: "", keep_alive: "10m", options: { num_ctx: NUM_CTX } }) });
    if (!g.ok) throw new Error(`não carregou: ${g.status} ${await g.text()}`);
    res.cargaS = (performance.now() - t0) / 1000;
    const ps = await (await fetch(`${OLLAMA}/api/ps`)).json();
    const m = (ps.models || []).find((x: any) => x.name === modelo || x.model === modelo);
    if (m?.size && m.size > 5e8) { res.gpuPct = Math.round((100 * (m.size_vram || 0)) / m.size); res.tamanhoGB = m.size / 1e9; } // tamanhos < 0,5 GB vêm errados do Ollama
    console.log(`${res.cargaS.toFixed(1)} s; na GPU: ${res.gpuPct ?? "?"}% de ${res.tamanhoGB?.toFixed(1) ?? "?"} GB`);

    for (const caso of CASOS) {
      if (caso.imagem && !res.capacidades.includes("vision")) { console.log(`   ${caso.titulo}: ignorado (modelo sem vision)`); continue; }
      for (let rep = 1; rep <= REPETICOES; rep++) {
        console.log(`   ${caso.titulo}${REPETICOES > 1 ? ` (#${rep})` : ""}`);
        res.casos.push(await avaliarCaso(caso, (s, u, img) => ollamaChat(modelo, think, s, u, img), rep));
      }
    }
    process.stdout.write("   Tutor (streaming)… ");
    res.tutor = await ollamaTutor(modelo, think, chatSystemPrompt("10º ano", "Física"), PERGUNTA_TUTOR);
    console.log(res.tutor.erro ? `ERRO ${res.tutor.erro}` : `1.º token ${res.tutor.primeiroTokenS?.toFixed(1)} s, total ${res.tutor.segundos.toFixed(1)} s`);
  } catch (e) {
    res.erro = e instanceof Error ? e.message : String(e);
    console.log(`   ERRO: ${res.erro}`);
  }
  return res;
}

async function avaliarClaude(): Promise<Resultado> {
  const modelo = ENV.ANTHROPIC_MODEL || "claude-opus-5-5";
  const res: Resultado = { modelo, fornecedor: "anthropic", capacidades: ["vision"], casos: [] };
  if (!ENV.ANTHROPIC_API_KEY || ENV.ANTHROPIC_API_KEY.startsWith("sk-ant-...")) { res.erro = "ANTHROPIC_API_KEY em falta no .env"; return res; }
  for (const caso of CASOS) {
    for (let rep = 1; rep <= REPETICOES; rep++) {
      console.log(`   ${caso.titulo}${REPETICOES > 1 ? ` (#${rep})` : ""}`);
      res.casos.push(await avaliarCaso(caso, (s, u, img) => claudeChat(s, u, img), rep));
    }
  }
  process.stdout.write("   Tutor… ");
  const t = await claudeChat(chatSystemPrompt("10º ano", "Física"), PERGUNTA_TUTOR, undefined, CHAT_MAX_TOKENS, false);
  t.passo = "Tutor"; res.tutor = t;
  console.log(t.erro ? `ERRO ${t.erro}` : `total ${t.segundos.toFixed(1)} s`);
  return res;
}

// ---------- relatório ----------
const f1 = (n?: number) => (n === undefined || Number.isNaN(n) ? "—" : n.toFixed(1));
function textoTodo(r: Resultado) {
  return [...r.casos.flatMap((c) => c.passos.map((p) => p.texto)), r.tutor?.texto || ""].join("\n");
}
function relatorio(resultados: Resultado[], inicio: Date) {
  const L: string[] = [];
  L.push(`# Avaliação de modelos — MACASA IA`, "");
  L.push(`${inicio.toLocaleString("pt-PT")} · contexto ${NUM_CTX} tokens · modo pensar ${DESCRICAO_PENSAR} · ${REPETICOES} repetição(ões) por exercício · limite por passo na app: ${LIMITE_APP_S} s`, "");
  L.push("## Resumo", "");
  L.push("| Modelo | Na GPU | Carga (s) | " + CASOS.map((c) => `${c.id} total (s)`).join(" | ") + " | Tutor 1.º token / total (s) | tok/s médio | JSON válido | Respostas certas | Quiz rejeitado | JSON inválido à 1.ª (resolvido) | Ciclos | Passos > 400 s | Cortes por tokens | PT-PT / PT-BR | LaTeX estragado |");
  L.push("|---|---|---|" + CASOS.map(() => "---").join("|") + "|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of resultados) {
    if (r.erro && !r.casos.length) { L.push(`| ${r.modelo} | ERRO: ${r.erro.replace(/\|/g, "/")} |`); continue; }
    const passos = r.casos.flatMap((c) => c.passos);
    const tps = passos.map((p) => p.tokS).filter((x): x is number => !!x);
    const jsonOk = passos.filter((p) => p.jsonValido).length;
    const texto = textoTodo(r);
    const pt = contarMarcas(texto, PT_PT), br = contarMarcas(texto, PT_BR);
    L.push(`| **${r.modelo}** | ${r.gpuPct !== undefined ? `${r.gpuPct}% de ${f1(r.tamanhoGB)} GB` : r.fornecedor === "anthropic" ? "API" : "?"} | ${f1(r.cargaS)} | ` +
      CASOS.map((c) => { const x = r.casos.find((rc) => rc.caso === c.id); return x ? f1(x.totalS) : "—"; }).join(" | ") +
      ` | ${f1(r.tutor?.primeiroTokenS)} / ${f1(r.tutor?.segundos)} | ${tps.length ? f1(tps.reduce((a, b) => a + b, 0) / tps.length) : "—"}` +
      ` | ${jsonOk}/${passos.length} | ${r.casos.filter((c) => c.certo).length}/${r.casos.length}` +
      ` | ${r.casos.filter((c) => c.quizRejeitado).length}/${r.casos.length}` +
      ` | ${passos.filter((p) => p.novaTentativa).length} (${passos.filter((p) => p.novaTentativa && p.jsonValido).length})` +
      ` | ${r.casos.filter((c) => c.ciclo).length}/${r.casos.length}` +
      ` | ${passos.filter((p) => p.segundos > LIMITE_APP_S).length} | ${passos.filter((p) => p.fim === "length" || p.fim === "max_tokens").length}` +
      ` | ${pt.length} / ${br.length}${br.length ? ` (${br.join(", ")})` : ""} | ${latexEstragado(texto) ? "sim" : "não"} |`);
  }
  L.push("", "Leitura: *Na GPU* abaixo de 100% significa que parte do modelo corre no processador (mais lento). *Passos > 400 s* seriam cortados na aplicação. *PT-PT / PT-BR* conta expressões típicas de cada variante. *Quiz rejeitado*: a aplicação esconde-o por estar incoerente. *JSON inválido à 1.ª*: a app repete o pedido (entre parênteses, quantas vezes isso resolveu). *Ciclos*: exercícios em que o modelo repetiu o mesmo pedaço vezes sem conta.", "");

  for (const r of resultados) {
    L.push(`## ${r.modelo}`, "", `Capacidades: ${r.capacidades.join(", ") || "?"}${r.erro ? ` · Erro: ${r.erro}` : ""}`, "");
    for (const c of r.casos) {
      L.push(`### ${c.titulo} — ${c.certo ? "✅ certo" : "❌ não encontrado"} (${c.criterio}) · ${f1(c.totalS)} s${c.quizRejeitado ? " · quiz rejeitado (incoerente)" : ""}`, "");
      L.push("| Passo | Tempo (s) | Tokens | tok/s | Prompt | Pensamento (car.) | Fim | JSON |", "|---|---|---|---|---|---|---|---|");
      for (const p of c.passos) L.push(`| ${p.passo}${p.novaTentativa ? " (2 tentativas)" : ""} | ${f1(p.segundos)} | ${p.tokens ?? "—"} | ${f1(p.tokS)} | ${p.promptTokens ?? "—"} | ${p.pensamentoCar || "—"} | ${p.fim ?? (p.erro ? "erro" : "—")} | ${p.jsonValido ? "válido" : "inválido"} |`);
      L.push("");
      for (const p of c.passos) {
        const corpo = p.erro ? `ERRO: ${p.erro}` : (() => { const j = parseAiJson(p.texto); return j && !j.raw ? JSON.stringify(j, null, 2) : p.texto; })();
        L.push(`<details><summary>${p.passo}: resposta completa</summary>`, "", "```json", corpo, "```", "", "</details>", "");
      }
    }
    if (r.tutor) {
      L.push(`### Tutor — "${PERGUNTA_TUTOR}" · 1.º token ${f1(r.tutor.primeiroTokenS)} s · total ${f1(r.tutor.segundos)} s · ${r.tutor.tokens ?? "?"} tokens`, "");
      L.push("<details><summary>Resposta completa</summary>", "", r.tutor.erro ? `ERRO: ${r.tutor.erro}` : r.tutor.texto, "", "</details>", "");
    }
  }
  return L.join("\n");
}

// ---------- principal ----------
async function main() {
  const inicio = new Date();
  let modelos: string[];
  const pedidos = arg("--modelos");
  try {
    const tags = await (await fetch(`${OLLAMA}/api/tags`)).json();
    const instalados: string[] = (tags.models || []).map((m: any) => m.name);
    modelos = pedidos ? pedidos.split(",").map((s) => s.trim()).filter(Boolean)
      : instalados.filter((n) => !/embed/i.test(n) && !/[:-]cloud$/i.test(n)); // :cloud precisa de conta e não é local
  } catch {
    console.error(`Não consegui falar com o Ollama em ${OLLAMA}. O Ollama está aberto?`);
    process.exit(1);
  }
  console.log(`Modelos a avaliar: ${modelos.join(", ")}${COM_CLAUDE ? " + Claude" : ""}`);
  console.log(`Contexto ${NUM_CTX} · modo pensar ${DESCRICAO_PENSAR} · isto pode demorar bastante com modelos grandes.\n`);

  const resultados: Resultado[] = [];
  const dir = join(ROOT, "relatorios-modelos");
  mkdirSync(dir, { recursive: true });
  const nome = inicio.toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const gravar = () => {
    writeFileSync(join(dir, `${nome}.md`), relatorio(resultados, inicio), "utf8");
    writeFileSync(join(dir, `${nome}.json`), JSON.stringify(resultados, null, 2), "utf8");
  };
  for (const m of modelos) {
    for (const pensar of MODOS_PENSAR) {
      console.log(`▶ ${m}${MODOS_PENSAR.length === 2 ? ` · pensar ${pensar ? "ligado" : "desligado"}` : ""}`);
      const r = await avaliarOllama(m, pensar);
      if (r) { resultados.push(r); gravar(); } // grava a cada modelo: se parares a meio, o relatório parcial fica
    }
  }
  if (COM_CLAUDE) { console.log(`▶ Claude`); resultados.push(await avaliarClaude()); gravar(); }
  await descarregarTodos();
  console.log(`\nRelatório: relatorios-modelos/${nome}.md`);
}
main();
