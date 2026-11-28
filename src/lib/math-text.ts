import katex from "katex";
import { asciiParaLatex, corrigirDolaresSoltos, envolverMatematicaAscii, repararEscapes } from "@/lib/matematica-ascii";

// Divide o texto da IA em texto normal e fórmulas já em HTML do KaTeX. Usado pelo componente MathText
// e pela verificação das respostas guardadas (ver docs ou testes).

const MATH = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;

// A IA às vezes escreve LaTeX sem os $ no meio de uma frase (ex.: "Calculamos a raiz \\sqrt{9} para continuar"):
// só os comandos LaTeX (com os seus argumentos) passam a $…$. As linhas só de matemática já foram tratadas antes.
const LATEX_CMD = /\\[a-zA-Z]+/;
const TOKEN_LATEX = /\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\])*(?:\^\{[^{}]*\}|\^\S)?/g;
function delimitarLatexSolto(s: string): string {
  return s.split("\n").map((linha) => {
    if (linha.includes("$") || linha.includes("\\(") || linha.includes("\\[") || !LATEX_CMD.test(linha)) return linha;
    return linha.replace(TOKEN_LATEX, (t) => `$${t}$`);
  }).join("\n");
}

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Se o KaTeX não conseguir ler a fórmula (ex.: a IA entrou em ciclo e repetiu "\text{"), nunca mostramos
// código a vermelho ao aluno: primeiro tenta-se limpar; se mesmo assim falhar, mostra-se como texto simples.
function render(tex: string, displayMode: boolean): string {
  const opcoes = { displayMode, throwOnError: true, strict: "ignore" as const, output: "html" as const };
  const latex = asciiParaLatex(tex);
  try {
    return katex.renderToString(latex, opcoes);
  } catch {
    const limpo = latex.replace(/(?:\\(?:text|mathrm)\s*\{\s*){2,}/g, "\\text{");
    let abertas = 0;
    for (const c of limpo) abertas += c === "{" ? 1 : c === "}" ? -1 : 0;
    const equilibrado = abertas > 0 ? limpo + "}".repeat(abertas) : limpo;
    try {
      return katex.renderToString(equilibrado, opcoes);
    } catch {
      const texto = limpo
        .replace(/\\(?:text|mathrm|textrm|mbox)\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\(?:text|mathrm|textrm|mbox)\s*\{?/g, "")
        .replace(/\\(?:times|cdot)/g, "×").replace(/\\pm/g, "±").replace(/\\Delta/g, "Δ").replace(/\\sqrt/g, "√")
        .replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "").replace(/\s{2,}/g, " ").trim();
      return `<span class="font-mono">${escapar(texto)}</span>`;
    }
  }
}

export type ParteMathText = { kind: "text"; value: string } | { kind: "math"; html: string };

/** Divide o texto da IA em partes de texto e fórmulas já em HTML do KaTeX (usado pelo componente e pela verificação). */
export function partesMathText(text: unknown): ParteMathText[] {
  // 1) escapes estragados e $ esquecidos; 2) fórmulas soltas no texto passam a \(…\); 3) comandos LaTeX que sobrarem.
  const base = corrigirDolaresSoltos(repararEscapes(text == null ? "" : String(text)));
  const comAscii = base.split(MATH).map((p, i) => (i % 2 === 0 ? envolverMatematicaAscii(p) : p)).join("");
  const s = delimitarLatexSolto(comAscii);
  return s.split(MATH).map((part, i): ParteMathText => {
    if (i % 2 === 0) return { kind: "text", value: part };
    if (part.startsWith("$$")) return { kind: "math", html: render(part.slice(2, -2), true) };
    if (part.startsWith("\\[")) return { kind: "math", html: render(part.slice(2, -2), true) };
    if (part.startsWith("\\(")) return { kind: "math", html: render(part.slice(2, -2), false) };
    return { kind: "math", html: render(part.slice(1, -1), false) };
  });
}

