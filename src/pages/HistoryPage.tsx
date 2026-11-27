import AppLayout from "@/components/AppLayout";
import { Link } from "react-router-dom";
import { Flame, BarChart3, Target, Award, Calculator, History as HistoryIcon, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAttempts, computeStats, relativeTime, attemptTitle, MODE_LABELS } from "@/lib/attempts";

export default function HistoryPage() {
  const { data: attempts = [], isLoading, isError } = useAttempts();
  const stats = computeStats(attempts);
  const maxExercises = Math.max(1, ...stats.weekly.map((d) => d.exercises));
  const isEmpty = !isLoading && !isError && attempts.length === 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Histórico e Desempenho</h1>
          <p className="text-muted-foreground mb-6">Acompanha a tua evolução e identifica áreas de melhoria.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Target, label: "Total de exercícios", value: stats.total },
            { icon: BarChart3, label: "Esta semana", value: stats.thisWeek },
            { icon: Flame, label: "Dias seguidos", value: stats.streak },
            { icon: Award, label: "Temas diferentes", value: stats.topics },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-bold">{isLoading ? "—" : s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {isEmpty ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HistoryIcon className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">O teu histórico está vazio</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Cada exercício que resolveres fica guardado aqui, com o tema, a disciplina e a data, para poderes
              acompanhar a tua evolução.
            </p>
            <Button variant="hero" asChild>
              <Link to="/solve"><Calculator className="w-4 h-4" /> Resolver um exercício</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Weekly chart */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
              <h2 className="font-semibold text-lg mb-4">Últimos 7 dias</h2>
              <div className="flex items-end gap-3 h-32" role="img" aria-label={`Exercícios por dia nos últimos 7 dias: ${stats.weekly.map((d) => `${d.day} ${d.exercises}`).join(", ")}`}>
                {stats.weekly.map((d, i) => (
                  <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                    <div className="text-xs font-medium text-muted-foreground">{d.exercises}</div>
                    <div
                      className="w-full rounded-t-md bg-gradient-hero"
                      style={{ height: d.exercises ? `${(d.exercises / maxExercises) * 75}%` : "2px", opacity: d.exercises ? 1 : 0.3 }}
                    />
                    <div className="text-xs text-muted-foreground capitalize">{d.day}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* History list */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <h2 className="font-semibold text-lg mb-4">Últimos exercícios</h2>
              {isError && <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>}
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">A carregar…</p>
              ) : (
                <div className="space-y-2">
                  {attempts.slice(0, 100).map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate flex items-center gap-1.5">
                          {h.has_image && <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="Exercício por foto" />}
                          {attemptTitle(h)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[h.subject, h.difficulty, relativeTime(h.created_at)].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                        {MODE_LABELS[h.mode] || h.mode}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
