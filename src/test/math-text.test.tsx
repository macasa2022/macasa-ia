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
