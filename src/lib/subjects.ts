export const CANONICAL_SUBJECTS = ["Matemática", "Física", "Química"] as const;

export type CanonicalSubject = (typeof CANONICAL_SUBJECTS)[number];

const normalizeSubjectKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function normalizeSubjectName(value: string | null | undefined): CanonicalSubject | null {
  if (!value) return null;

  const normalizedValue = normalizeSubjectKey(value);
  return CANONICAL_SUBJECTS.find((subject) => normalizeSubjectKey(subject) === normalizedValue) ?? null;
}

export function getValidSubjects(values: string[] | null | undefined): CanonicalSubject[] {
  if (!values?.length) return [];

  const seen = new Set<CanonicalSubject>();

  return values.reduce<CanonicalSubject[]>((acc, value) => {
    const normalized = normalizeSubjectName(value);
    if (!normalized || seen.has(normalized)) return acc;

    seen.add(normalized);
    acc.push(normalized);
    return acc;
  }, []);
}

export function getPrimarySubject(values: string[] | null | undefined): CanonicalSubject | null {
  return getValidSubjects(values)[0] ?? null;
}