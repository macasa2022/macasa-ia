import AppLayout from "@/components/AppLayout";
import { Calendar, CheckCircle2, Clock, Target, AlertTriangle, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateStudyPlan } from "@/lib/ai-stream";
import { relativeTime } from "@/lib/attempts";

type Task = { id: string; tema: string; disciplina: string; tipo: string; minutos: number };
type Plan = {
  resumo?: string;
  dias: { dia: string; tarefas: Task[] }[];
  prioridades: { tema: string; disciplina: string; urgencia: string; motivo: string }[];
};
type PlanRow = { id: string; plan: Plan; done: string[]; created_at: string };

export default function StudyPlanPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: row, isLoading } = useQuery({
    queryKey: ["study-plan", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PlanRow | null> => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("id, plan, done, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PlanRow) ?? null;
    },
  });

  const generate = async () => {
    setGenerating(true);
    try {
      const saved = await generateStudyPlan();
      queryClient.setQueryData(["study-plan", user?.id], saved);
      toast.success("Plano de estudo criado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o plano.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!row) return;
    const done = row.done.includes(taskId) ? row.done.filter((d) => d !== taskId) : [...row.done, taskId];
    queryClient.setQueryData(["study-plan", user?.id], { ...row, done });
    const { error } = await supabase.from("study_plans").update({ done }).eq("id", row.id);
    if (error) {
      toast.error("Não foi possível guardar.");
      queryClient.invalidateQueries({ queryKey: ["study-plan"] });
    }
  };

  const tasks = row?.plan.dias.flatMap((d) => d.tarefas) ?? [];
  const doneCount = tasks.filter((t) => row?.done.includes(t.id)).length;
  const remainingMin = tasks.filter((t) => !row?.done.includes(t.id)).reduce((sum, t) => sum + (t.minutos || 0), 0);
  const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ""}` : `${m} min`);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Plano de Estudo</h1>
            <p className="text-muted-foreground">
              Plano de 7 dias criado pela IA com base nos exercícios que resolveste.
              {row && <> Criado {relativeTime(row.created_at).toLowerCase()}.</>}
            </p>
          </div>
          {row && (
            <Button variant="outline" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Gerar novo plano
            </Button>
          )}
        </motion.div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : !row ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Ainda não tens um plano de estudo</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              A IA analisa os exercícios que já resolveste (temas, disciplinas e dificuldade) e propõe o que estudar
              em cada dia da semana. Se ainda não resolveste nenhum, recebes um plano inicial para o teu ano.
            </p>
            <Button variant="hero" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generating ? "A preparar o plano…" : "Criar o meu plano"}
            </Button>
          </div>
        ) : (
          <>
            {row.plan.resumo && (
              <p className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">{row.plan.resumo}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <Target className="w-5 h-5 text-primary mb-2" />
                <div className="text-2xl font-bold">{tasks.length}</div>
                <div className="text-xs text-muted-foreground">Tarefas para esta semana</div>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-success mb-2" />
                <div className="text-2xl font-bold">{doneCount}/{tasks.length}</div>
                <div className="text-xs text-muted-foreground">Concluídas</div>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <Clock className="w-5 h-5 text-accent mb-2" />
                <div className="text-2xl font-bold">{fmtMin(remainingMin)}</div>
                <div className="text-xs text-muted-foreground">Tempo estimado restante</div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
              <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-primary" /> Plano Semanal</h2>
              <div className="space-y-3">
                {row.plan.dias.map((day, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50">
                    <div className="w-20 text-sm font-semibold text-muted-foreground pt-0.5">{day.dia}</div>
                    <div className="flex-1 space-y-2">
                      {day.tarefas.length === 0 && <span className="text-sm text-muted-foreground">Descanso</span>}
                      {day.tarefas.map((t) => {
                        const done = row.done.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTask(t.id)}
                            aria-pressed={done}
                            className="flex flex-wrap items-center gap-2 text-left w-full"
                          >
                            <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${done ? "bg-success border-success" : "border-border"}`}>
                              {done && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                            </span>
                            <span className={`text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{t.tema}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t.disciplina}</span>
                            <span className="text-xs text-muted-foreground">{t.tipo} · {t.minutos} min</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {row.plan.prioridades.length > 0 && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-warning" /> Tópicos Prioritários</h2>
                <div className="space-y-3">
                  {row.plan.prioridades.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50">
                      <div>
                        <div className="font-medium text-sm">{p.tema}</div>
                        <div className="text-xs text-muted-foreground">{p.disciplina} · {p.motivo}</div>
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${p.urgencia === "Alta" ? "bg-destructive/10 text-destructive" : p.urgencia === "Baixa" ? "bg-secondary text-muted-foreground" : "bg-warning-light text-warning"}`}>{p.urgencia}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
