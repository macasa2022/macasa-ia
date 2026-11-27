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
});
