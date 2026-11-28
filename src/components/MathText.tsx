import { Fragment, useMemo } from "react";
import "katex/dist/katex.min.css";
import { partesMathText } from "@/lib/math-text";

// Mostra texto da IA com as fórmulas já formatadas (KaTeX).
// Reconhece: $$…$$ e \[…\] (em bloco), $…$ e \(…\) (na linha), LaTeX solto sem $ e a matemática mal escrita
// pelos modelos pequenos (ASCII, por extenso, $ esquecidos), tratada em src/lib/matematica-ascii.ts.
// O resto do texto fica tal como veio (as quebras de linha mantêm-se se o elemento-pai tiver whitespace-pre-wrap).

export function MathText({ text }: { text: unknown }) {
  const parts = useMemo(() => partesMathText(text), [text]);
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
