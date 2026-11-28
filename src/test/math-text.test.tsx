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

  it("não mexe em texto sem LaTeX nem em linhas que já têm $", () => {
    const { container } = render(<p><MathText text={"Preço: 9,99 € e $x = 6$ \\pm"} /></p>);
    expect(container.querySelectorAll(".katex").length).toBe(1);
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
