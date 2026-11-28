import { describe, it, expect } from "vitest";
import { asciiParaLatex, corrigirDolaresSoltos, envolverMatematicaAscii } from "@/lib/matematica-ascii";

describe("asciiParaLatex", () => {
  it.each([
    ["x = -b +/- sqrt(b^2 - 4ac)", "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"],
    ["x = (-b +/- sqrt(b^2 - 4ac))/(2a)", "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"],
    ["x = (-b ± sqrt(b^2 - 4*a*c)) / 2a", "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"],
    ["Delta = b^2 - 4ac", "\\Delta = b^2 - 4ac"],
    ["e^(2x) >= 1", "e^{2x} \\geq 1"],
    ["3*4 = 12", "3\\times 4 = 12"],
    ["4 \\times 15 \\times -1", "4 \\times 15 \\times (-1)"],
  ])("%s", (entrada, esperado) => {
    expect(asciiParaLatex(entrada)).toBe(esperado);
  });

  it("deixa LaTeX correto como está", () => {
    for (const t of ["x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", "\\Delta = b^2 - 4ac", "v_0 = 0", "a = 4\\,\\text{m/s}^2", "\\beta + \\pi"]) {
      expect(asciiParaLatex(t)).toBe(t);
    }
  });
});

describe("envolverMatematicaAscii", () => {
  it("envolve só a fórmula e deixa as palavras de fora", () => {
    expect(envolverMatematicaAscii("Equação quadrática: ax^2 + bx + c = 0")).toBe("Equação quadrática: \\(ax^2 + bx + c = 0\\)");
    expect(envolverMatematicaAscii("o discriminante (Delta = b^2 - 4ac), levando")).toBe("o discriminante (\\(Delta = b^2 - 4ac\\)), levando");
    expect(envolverMatematicaAscii("O resultado é x = 3 e depois y = 4.")).toBe("O resultado é \\(x = 3\\) e depois \\(y = 4\\).");
  });

  it("não mexe em texto sem fórmulas", () => {
    for (const t of ["Velocidade inicial: 0 m/s e o preço é 9,99 €", "Erro 1: esquecer o sinal no termo -b.", "Data: 2026-11-28"]) {
      expect(envolverMatematicaAscii(t)).toBe(t);
    }
  });
});

describe("corrigirDolaresSoltos", () => {
  it.each([
    ["$c = -1", "$c = -1$"],
    ["Substituindo: x = 2 \\times 3$", "Substituindo: x = 2 \\times 3"],
    ["$a = 1$ e $b = 2$", "$a = 1$ e $b = 2$"],
    ["Preço: 9,99 €", "Preço: 9,99 €"],
  ])("%s", (entrada, esperado) => {
    expect(corrigirDolaresSoltos(entrada)).toBe(esperado);
  });
});
