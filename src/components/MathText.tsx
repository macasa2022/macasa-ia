import { Fragment, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { asciiParaLatex, corrigirDolaresSoltos, envolverMatematicaAscii } from "@/lib/matematica-ascii";

// Mostra texto da IA com as fórmulas LaTeX já formatadas (KaTeX).
// Reconhece: $$…$$ e \[…\] (em bloco), $…$ e \(…\) (na linha), LaTeX solto sem $ (ver delimitarLatexSolto)
// e matemática em ASCII ("x = -b +/- sqrt(b^2 - 4ac)", "Delta", "ax^2"), convertida em src/lib/matematica-ascii.ts.
// O resto do texto fica tal como veio (as quebras de linha mantêm-se se o
// elemento-pai tiver whitespace-pre-wrap).

const MATH = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;

// A IA às vezes escreve LaTeX sem os $ (ex.: "\\sqrt{9} = \\pm3"). Linha a linha, sem $ nenhum:
//  - se a linha é só matemática (tirando os comandos não sobram palavras), passa toda a $…$;
//  - se mistura texto, só os comandos LaTeX (com os seus argumentos) passam a $…$.
const LATEX_CMD = /\\[a-zA-Z]+/;
const TOKEN_LATEX = /\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\])*(?:\^\{[^{}]*\}|\^\S)?/g;
function delimitarLatexSolto(s: string): string {
  return s.split("\n").map((linha) => {
    if (linha.includes("$") || linha.includes("\\(") || linha.includes("\\[") || !LATEX_CMD.test(linha)) return linha;
    const semComandos = linha.replace(/\\text\{[^{}]*\}/g, "").replace(/\\[a-zA-Z]+/g, "");
    if (!/[A-Za-zÀ-ÿ]{4,}/.test(semComandos)) {
      const m = /^(\s*)(.*?)(\s*)$/.exec(linha)!;
      return m[2] ? `${m[1]}$${m[2]}$${m[3]}` : linha;
    }
    return linha.replace(TOKEN_LATEX, (t) => `$${t}$`);
  }).join("\n");
}

function render(tex: string, displayMode: boolean): string {
  return katex.renderToString(asciiParaLatex(tex), { displayMode, throwOnError: false, strict: "ignore", output: "html" });
}

export function MathText({ text }: { text: unknown }) {
  const parts = useMemo(() => {
    // 1) $ esquecidos; 2) fórmulas ASCII/LaTeX no texto normal passam a \(…\); 3) LaTeX solto que sobrar.
    const base = corrigirDolaresSoltos(text == null ? "" : String(text));
    const comAscii = base.split(MATH).map((p, i) => (i % 2 === 0 ? envolverMatematicaAscii(p) : p)).join("");
    const s = delimitarLatexSolto(comAscii);
    return s.split(MATH).map((part, i) => {
      if (i % 2 === 0) return { kind: "text" as const, value: part };
      if (part.startsWith("$$")) return { kind: "math" as const, html: render(part.slice(2, -2), true) };
      if (part.startsWith("\\[")) return { kind: "math" as const, html: render(part.slice(2, -2), true) };
      if (part.startsWith("\\(")) return { kind: "math" as const, html: render(part.slice(2, -2), false) };
      return { kind: "math" as const, html: render(part.slice(1, -1), false) };
    });
  }, [text]);

  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <Fragment key={i}>{p.value}</Fragment>
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
        ),
      )}
    </>
  );
}

export default MathText;
