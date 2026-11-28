import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathText } from "@/components/MathText";

describe("MathText", () => {
  it("formata LaTeX entre $...$ e mantém o texto normal", () => {
    const { container } = render(<p><MathText text={"Velocidade inicial ($v_0$): 0 m/s"} /></p>);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).toContain("Velocidade inicial (");
    expect(container.textContent).not.toContain("$v_0$");
  });

  it("formata frações e blocos $$...$$", () => {
    const { container } = render(<div><MathText text={"$a = \\frac{20}{5}$\n$$a = 4\\,\\text{m/s}^2$$"} /></div>);
    expect(container.querySelectorAll(".katex").length).toBe(2);
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("não falha com LaTeX inválido nem com texto sem fórmulas", () => {
    const { container } = render(<p><MathText text={"$\\frac{1$ e 9,99 €"} /></p>);
    expect(container.textContent).toContain("9,99 €");
    render(<p><MathText text={null} /></p>);
  });

  it("formata LaTeX escrito sem $ (linha só de matemática)", () => {
    const { container } = render(<div><MathText text={"\\sqrt{(x - 2)^2} = \\pm\\sqrt{9}\nx - 2 = \\pm3"} /></div>);
    expect(container.querySelectorAll(".katex").length).toBe(2);
    expect(container.textContent).not.toContain("\\sqrt");
    expect(container.textContent).not.toContain("\\pm");
  });

  it("em texto misturado, formata só os comandos LaTeX e mantém as palavras", () => {
    const { container } = render(<p><MathText text={"Calculamos a raiz \\sqrt{9} para continuar"} /></p>);
    expect(container.querySelectorAll(".katex").length).toBe(1);
    expect(container.textContent).toContain("Calculamos a raiz");
    expect(container.textContent).toContain("para continuar");
  });

  it("não mexe em texto sem LaTeX; um comando solto como \\pm passa a símbolo", () => {
    const { container } = render(<p><MathText text={"Preço: 9,99 € e $x = 6$ \\pm"} /></p>);
    expect(container.textContent).toContain("Preço: 9,99 € e");
    expect(container.textContent).not.toContain("\\pm");
  });
});

describe("MathText — matemática escrita em ASCII pela IA", () => {
  it("formata as fórmulas ASCII das «Fórmulas relevantes» e mantém o rótulo", () => {
    const { container } = render(<span><MathText text={"Fórmula resolvente: x = -b +/- sqrt(b^2 - 4ac)"} /></span>);
    expect(container.querySelectorAll(".katex").length).toBe(1);
    expect(container.textContent).toContain("Fórmula resolvente:");
    expect(container.textContent).not.toContain("sqrt");
    expect(container.textContent).not.toContain("+/-");
    expect(container.querySelector(".katex .sqrt")).not.toBeNull();
    expect(container.querySelector(".katex .mfrac")).not.toBeNull(); // o /2a em falta é reposto
  });

  it("formata ax^2 + bx + c = 0 sem $", () => {
    const { container } = render(<span><MathText text={"Equação quadrática: ax^2 + bx + c = 0"} /></span>);
    expect(container.querySelectorAll(".katex").length).toBe(1);
    expect(container.textContent).not.toContain("^");
  });

  it("corrige ASCII dentro de $…$ (sqrt, +/-, Delta sem barra)", () => {
    const { container } = render(<p><MathText text={"pela fórmula resolvente: $x = -b +/- sqrt(b^2 - 4ac)$. O discriminante ($Delta = b^2 - 4ac$)"} /></p>);
    expect(container.querySelectorAll(".katex").length).toBe(2);
    expect(container.textContent).not.toMatch(/sqrt|\+\/-|Delta/);
    expect(container.textContent).toContain("Δ");
  });

  it("não transforma texto normal, preços nem LaTeX já correto", () => {
    const { container } = render(<p><MathText text={"Velocidade inicial: 0 m/s e o preço é 9,99 €"} /></p>);
    expect(container.querySelector(".katex")).toBeNull();
    const ok = render(<p><MathText text={"$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$"} /></p>);
    expect(ok.container.querySelectorAll(".katex .mfrac").length).toBe(1);
  });
});

describe("MathText — casos reais do gemma4:e2b (equação 15x² + 2x − 1 = 0)", () => {
  const semLixo = (c: HTMLElement) => {
    expect(c.querySelector(".katex-error, [style*='#cc0000']")).toBeNull();
    expect(c.textContent).not.toMatch(/sqrt|\$|\\[a-zA-Z]|\+\/-/);
  };

  it("$ esquecido no fim de uma linha: $c = -1", () => {
    const { container } = render(<div><MathText text={"Na equação $15x^2 + 2x - 1 = 0$:\n$a = 15$\n$b = 2$\n$c = -1"} /></div>);
    expect(container.querySelectorAll(".katex").length).toBe(4);
    semLixo(container);
  });

  it("\\pm colado a sqrt e substituição com \\times e $ só a fechar", () => {
    const { container } = render(<div><MathText text={"$x = \\frac{-b \\pmsqrt(b^2-4ac)}{2a}$\nSubstituindo: x = (-2 ± sqrt(2^2 - 4 \\times 15 \\times -1)) / (2 \\times 15)$"} /></div>);
    expect(container.querySelectorAll(".katex").length).toBe(2);
    expect(container.querySelectorAll(".katex .sqrt").length).toBe(2);
    expect(container.querySelectorAll(".katex .mfrac").length).toBe(2);
    expect(container.textContent).toContain("Substituindo:");
    semLixo(container);
  });

  it("sqrt dentro de \\text{} ou com \\sqrt(…)", () => {
    for (const t of ["$x = \\frac{-2 \\pm \\text{sqrt}(64)}{30}$", "$x = \\frac{-2 \\text{±sqrt}(64)}{30}$", "$x = \\frac{-2 \\pm \\sqrt(64)}{30}$", "$x = \\frac{-2 \\pm \\mathrm{sqrt}(64)}{30}$"]) {
      const { container } = render(<div><MathText text={t} /></div>);
      expect(container.querySelector(".katex .sqrt")).not.toBeNull();
      semLixo(container);
    }
  });

  it("unidades em \\text{} ficam como estão", () => {
    const { container } = render(<p><MathText text={"$a = 4\\,\\text{m/s}^2$"} /></p>);
    expect(container.textContent).toContain("m/s");
  });
});

describe("MathText — textos reais guardados na base de dados (gemma4:e2b)", () => {
  const semLixo = (c: HTMLElement) => {
    expect(c.querySelector(".katex-error, [style*='#cc0000']")).toBeNull();
    expect(c.textContent).not.toMatch(/sqrt|\$|\\[a-zA-Z]|\+\/-|mais ou menos|raiz quadrada de \(/);
  };
  const casos: [string, string, RegExp?][] = [
    ["\\text{Delta} dentro de $", "Calcula primeiro o discriminante $\\text{Delta} = b^2 - 4ac$. Lembra-te", /Δ/],
    ["\\textDelta (TAB + extDelta)", "Calcular o discriminante ($\textDelta$)", /Δ/],
    ["\\textDelta sem $", "\textDelta = (-5)^2 - 4 \\times 1 \\times 6", /Δ/],
    ["mais ou menos / raiz quadrada de em \\text", "Usamos a fórmula: $x = \\frac{-b \\text{ mais ou menos } \\text{raiz quadrada de } (b^2 - 4ac)}{2a}$.", /±/],
    ["raiz de sem parênteses até ao fim do grupo", "é $x = \\frac{-b \\text{ mais ou menos } \\text{raiz de } b^2 - 4ac}{2a}$. Substitui", /±/],
    ["raiz quadrada de 57", "Podes deixar a resposta exata com $\\text{raiz quadrada de } 57$, mas", undefined],
    ["linha toda em LaTeX sem o primeiro $ e fórmulas separadas por $  $",
      "\\text{Raiz quadrada de } 57 \\text{ é aproximadamente } 7.55 \\text{.}$  $x_1 = \\frac{3 + 7.55}{12} = \\frac{10.55}{12} \\text{ (aproximadamente } 0.879 \\text{)}$  $x_2 = \\frac{3 - 7.55}{12}$", /aproximadamente/],
    ["por extenso no texto", "na fórmula do discriminante: Delta = 2 ao quadrado menos 4 vezes 24 vezes (-1).", /Δ/],
    ["por extenso com sobre e número escrito", "A fórmula é x = (-b +/- sqrt(b ao quadrado menos quatro vezes a vezes c)) sobre 2a. Depois", /±/],
    ["coeficientes colados", "os coeficientes são identificados como a=15, b=2 e c=-1.", undefined],
    ["\\n escrito à letra", "Comparando com $ax^2 + bx + c = 0$: \\n$a = 1$\\n$b = -5$\\n$c = 6$", undefined],
    ["ciclo de \\text{ (nunca a vermelho)", "$x = -\\frac{b \\text{ \\text{ \\text{ \\text{ \\text{ \\text{ \\text{ mais", undefined],
  ];
  it.each(casos)("%s", (_nome, texto, deveTer) => {
    const { container } = render(<div className="whitespace-pre-wrap"><MathText text={texto} /></div>);
    semLixo(container);
    if (deveTer) expect(container.textContent).toMatch(deveTer);
  });

  it("frases normais com «menos», «mais» e «raiz» ficam como estão", () => {
    const t = "Há pelo menos duas soluções, a menos que o discriminante seja zero. Calculamos a raiz quadrada de 57 e depois somamos mais um passo.";
    const { container } = render(<p><MathText text={t} /></p>);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toBe(t);
  });
});
