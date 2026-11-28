// Leitura do JSON devolvido pela IA (sem dependências): usado pela mentor-ai e pela avaliação de modelos.

// Comandos LaTeX que começam por letras que, em JSON, são escapes (\b \f \n \r \t \u).
// Ex.: a IA escreve "\text{m}" com uma só barra -> JSON lê \t (tabulação) + "ext{m}".
const LATEX_ESCAPE_LOOKALIKES = new Set([
  "text", "textbf", "textit", "textrm", "times", "theta", "tau", "tan", "tanh", "to", "top", "tfrac", "tilde",
  "frac", "forall", "flat", "beta", "bar", "binom", "boldsymbol", "bf", "bmod", "bot", "big", "bigl", "bigr",
  "bigg", "biggl", "biggr", "nu", "neq", "ne", "nabla", "neg", "newline", "not", "notin", "nmid", "rightarrow",
  "right", "rho", "rm", "rangle", "rfloor", "rceil", "underline", "uparrow", "upsilon", "underbrace",
]);

/** Duplica as barras de LaTeX que a IA não escapou no JSON (sem tocar nos escapes reais, como \n). */
export function fixLatexEscapes(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") { out += ch; continue; }
    const next = raw[i + 1] ?? "";
    if (next === "\\" || next === '"' || next === "/") { out += ch + next; i++; continue; } // escape válido
    const word = /^[a-zA-Z]+/.exec(raw.slice(i + 1))?.[0] ?? "";
    if ("bfnrtu".includes(next) && next !== "") {
      const isUnicode = next === "u" && /^u[0-9a-fA-F]{4}/.test(raw.slice(i + 1, i + 6));
      if (!isUnicode && LATEX_ESCAPE_LOOKALIKES.has(word)) { out += "\\\\"; continue; }
      if (next !== "u" || isUnicode) { out += ch; continue; } // \n, \t… verdadeiros
    }
    out += "\\\\"; // escape inválido em JSON (\sqrt, \cdot, \alpha…): é LaTeX
  }
  return out;
}

export function parseAiJson(content: string): any {
  const cleaned = fixLatexEscapes(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const m = cleaned.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : { raw: content };
    } catch {
      return { raw: content };
    }
  }
}

const SINAIS_DE_QUIZ_ERRADO = /corre[cç][aã]o|corrigir|reavali|assumimos|n[aã]o est[aá] listad|nenhuma (das op|é)|erro na (formula|op)/i;

/**
 * Valida o quiz do modo prática e remove-o se estiver incoerente
 * (opção certa inexistente, opções vazias ou explicação com "correções").
 * Devolve true se o quiz foi removido.
 */
export function cleanPractice(p: any): boolean {
  const q = p?.quiz;
  if (!q || typeof q !== "object") return false;
  const opcoes: string[] = Array.isArray(q.opcoes) ? q.opcoes.map((o: unknown) => String(o ?? "").trim()) : [];
  const correta = String(q.correta ?? "").trim();
  const letra = /^[A-Da-d]\b/.exec(correta)?.[0]?.toUpperCase();
  const idx = letra ? letra.charCodeAt(0) - 65 : opcoes.findIndex((o) => o === correta);
  const opcoesVazias = opcoes.length < 2 || opcoes.every((o) => /^[A-D][).:]?$/i.test(o));
  const explicacao = String(q.explicacao ?? "");
  const invalido = opcoesVazias || idx < 0 || idx >= opcoes.length || SINAIS_DE_QUIZ_ERRADO.test(explicacao);
  if (invalido) delete p.quiz;
  return invalido;
}

// Termos do português do Brasil que um modelo pequeno ainda deixa escapar, com equivalente seguro.
const PT_BR_PARA_PT: [RegExp, string][] = [
  [/f[óo]rmula de (bh|b)[áa]skara/gi, "fórmula resolvente"],
  [/\b(de |por |pela )?bh[áa]skara\b/gi, "$1fórmula resolvente"],
  [/\btrin[ôo]mio/g, "trinómio"], [/\bpolin[ôo]mio/g, "polinómio"], [/\bbin[ôo]mio/g, "binómio"], [/\bmon[ôo]mio/g, "monómio"],
  [/\btrens\b/g, "comboios"], [/\btrem\b/g, "comboio"], [/\bTrem\b/g, "Comboio"],
  [/\b[ôo]nibus\b/g, "autocarro"], [/\becon[ôo]mic/g, "económic"], [/\bfatora[çc][ãa]o\b/g, "fatorização"],
];

/** Corrige termos PT-BR conhecidos em todas as strings de um objeto (respostas em JSON da IA). */
export function ptPtFix<T>(v: T): T {
  if (typeof v === "string") return PT_BR_PARA_PT.reduce((s, [re, por]) => s.replace(re, por), v as string) as T;
  if (Array.isArray(v)) return v.map(ptPtFix) as T;
  if (v && typeof v === "object") {
    for (const k of Object.keys(v as object)) (v as any)[k] = ptPtFix((v as any)[k]);
  }
  return v;
}

/**
 * Pede JSON à IA e, se a resposta não for JSON válido (cortada, em ciclo…), tenta uma segunda vez.
 * gerar(tentativa) recebe 1 ou 2; na 2.ª o chamador acrescenta a RETRY_RULE ao prompt.
 */
export async function jsonComNovaTentativa(gerar: (tentativa: number) => Promise<string>) {
  let content = await gerar(1);
  let parsed = parseAiJson(content);
  let tentativas = 1;
  if (!parsed || parsed.raw) {
    tentativas = 2;
    content = await gerar(2);
    parsed = parseAiJson(content);
  }
  if (parsed && !parsed.raw) ptPtFix(parsed);
  return { parsed, content, tentativas };
}
