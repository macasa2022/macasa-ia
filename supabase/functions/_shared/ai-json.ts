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
