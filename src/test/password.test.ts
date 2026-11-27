import { describe, it, expect } from "vitest";
import { isPasswordValid, passwordErrors } from "@/lib/password";

describe("regras da palavra-passe", () => {
  it("aceita palavra-passe com 8+ caracteres, maiúscula e especial", () => {
    expect(isPasswordValid("Uncarra@2026")).toBe(true);
    expect(isPasswordValid("Ábcdefg!")).toBe(true);
  });
  it("rejeita curta", () => {
    expect(passwordErrors("Ab@1")).toContain("Pelo menos 8 caracteres");
  });
  it("rejeita sem maiúscula", () => {
    expect(passwordErrors("abcdefg@")).toContain("Uma letra maiúscula");
  });
  it("rejeita sem caractere especial (letras acentuadas e espaços não contam)", () => {
    expect(isPasswordValid("Abcdefgh1")).toBe(false);
    expect(isPasswordValid("Açúcar ção")).toBe(false);
  });
});
