import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeSubjectName, type CanonicalSubject } from "@/lib/subjects";
import type { Json } from "@/integrations/supabase/types";

// ---------- Tipos ----------
export type Attempt = {
  id: string;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  difficulty: string | null;
  school_year: string | null;
  mode: string;
  exercise_text: string | null;
  has_image: boolean;
  created_at: string;
};

export const MODE_LABELS: Record<string, string> = {
  solve_resolve: "Resolver",
  solve_explain: "Explicar",
  solve_hint: "Pista",
  solve_training: "Treino",
  solve_professor: "Professor",
};

// ---------- Gravar ----------
export async function saveAttempt(params: {
  userId: string;
  selectedSubject?: string;
  year?: string;
  mode: string;
  exerciseText: string;
  hasImage: boolean;
  analysis?: Record<string, unknown> | null;
  result: Record<string, unknown>;
}) {
  const a = params.analysis && !("raw" in params.analysis) ? params.analysis : null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);
  const subject =
    normalizeSubjectName(str(a?.disciplina)) ?? normalizeSubjectName(params.selectedSubject) ?? str(a?.disciplina);

  const { error } = await supabase.from("exercise_attempts").insert({
    user_id: params.userId,
    subject,
    topic: str(a?.tema),
    subtopic: str(a?.subtema),
    difficulty: str(a?.dificuldade),
    school_year: params.year || str(a?.ano_estimado),
    mode: params.mode,
    exercise_text: params.exerciseText ? params.exerciseText.slice(0, 4000) : null,
    has_image: params.hasImage,
    result: params.result as unknown as Json,
  });
  if (error) console.error("Erro ao gravar no histórico:", error);
}

// ---------- Ler ----------
export function useAttempts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exercise-attempts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from("exercise_attempts")
        .select("id, subject, topic, subtopic, difficulty, school_year, mode, exercise_text, has_image, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Estatísticas ----------
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function computeStats(attempts: Attempt[], now = new Date()) {
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  const days = new Set(attempts.map((a) => dayKey(new Date(a.created_at))));

  // Streak: dias seguidos com pelo menos um exercício, a contar de hoje (ou ontem).
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const topics = new Set(attempts.map((a) => (a.topic || "").toLowerCase()).filter(Boolean));

  const bySubject = new Map<string, number>();
  for (const a of attempts) {
    const s = normalizeSubjectName(a.subject) ?? "Outra";
    bySubject.set(s, (bySubject.get(s) ?? 0) + 1);
  }

  // Últimos 7 dias (do mais antigo para hoje)
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const key = dayKey(d);
    return {
      day: d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", ""),
      exercises: attempts.filter((a) => dayKey(new Date(a.created_at)) === key).length,
    };
  });

  return {
    total: attempts.length,
    thisWeek: attempts.filter((a) => new Date(a.created_at) >= weekAgo).length,
    streak,
    topics: topics.size,
    bySubject,
    weekly,
  };
}

export function subjectCount(stats: ReturnType<typeof computeStats>, subject: CanonicalSubject) {
  return stats.bySubject.get(subject) ?? 0;
}

// ---------- Formatação ----------
export function relativeTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "Agora mesmo";
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24 && dayKey(d) === dayKey(now)) return `Hoje, ${d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return `Ontem, ${d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
  const diffD = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffD < 7) return `Há ${diffD} dias`;
  return d.toLocaleDateString("pt-PT");
}

export function attemptTitle(a: Attempt) {
  if (a.topic) return a.topic;
  if (a.exercise_text && a.exercise_text !== "(imagem)") {
    const t = a.exercise_text.replace(/\s+/g, " ").trim();
    return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  }
  return a.has_image ? "Exercício por foto" : "Exercício";
}
