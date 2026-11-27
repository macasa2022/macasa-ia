// Regras da palavra-passe (registo).
// Mínimo 8 caracteres, pelo menos uma letra maiúscula e um caractere especial.

export type PasswordRule = { id: string; label: string; test: (pw: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (pw) => [...pw].length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", test: (pw) => /\p{Lu}/u.test(pw) },
  // Especial = qualquer coisa que não seja letra (incl. acentuadas), número ou espaço.
  { id: "special", label: "Um caractere especial (ex.: ! @ # $ %)", test: (pw) => /[^\p{L}\p{N}\s]/u.test(pw) },
];

export function passwordErrors(pw: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(pw)).map((r) => r.label);
}

export function isPasswordValid(pw: string): boolean {
  return passwordErrors(pw).length === 0;
}
