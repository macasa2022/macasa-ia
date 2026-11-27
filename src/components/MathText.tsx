import { Fragment, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Mostra texto da IA com as fórmulas LaTeX já formatadas (KaTeX).
// Reconhece: $$…$$ e \[…\] (em bloco) e $…$ e \(…\) (na linha).
// O resto do texto fica tal como veio (as quebras de linha mantêm-se se o
// elemento-pai tiver whitespace-pre-wrap).

const MATH = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;

function render(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, { displayMode, throwOnError: false, strict: "ignore", output: "html" });
}

export function MathText({ text }: { text: unknown }) {
  const parts = useMemo(() => {
    const s = text == null ? "" : String(text);
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
