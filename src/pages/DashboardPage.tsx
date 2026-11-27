import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Calculator, MessageCircle, Flame, Target, Clock, Sparkles, ArrowRight, Award, BarChart3, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import SubjectChangeCard from "@/components/SubjectChangeCard";
import { getPrimarySubject, CANONICAL_SUBJECTS, type CanonicalSubject } from "@/lib/subjects";
import { useAttempts, computeStats, subjectCount, relativeTime, attemptTitle } from "@/lib/attempts";

const subjectColors: Record<string, string> = {
  Matemática: "bg-math",
  Física: "bg-physics",
  Química: "bg-chemistry",
};

const difficultyClass = (d: string | null) =>
  d === "Fácil" ? "bg-success-light text-success" : d === "Difícil" ? "bg-destructive/10 text-destructive" : "bg-warning-light text-warning";

export default function DashboardPage() {
  const { profile, isAdmin, isPremium } = useAuth();
  const displayName = profile?.nome?.trim() || "";
  const { data: attempts = [], isLoading } = useAttempts();
  const stats = computeStats(attempts);

  const isFreeUser = !isAdmin && !isPremium;
  const enrolledSubject = getPrimarySubject(profile?.disciplinas_favoritas);
  const visibleSubjects: CanonicalSubject[] = isFreeUser
    ? (enrolledSubject ? [enrolledSubject] : [])
    : [...CANONICAL_SUBJECTS];

  const recent = attempts.slice(0, 4);
  const lastWithTopic = attempts.find((a) => a.topic);
  const isEmpty = !isLoading && attempts.length === 0;
  const maxBySubject = Math.max(1, ...visibleSubjects.map((s) => subjectCount(stats, s)));

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Olá{displayName ? `, ${displayName}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground">Pronto para aprender mais hoje?</p>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Button variant="hero" size="lg" asChild className="h-auto py-5 justify-start">
            <Link to="/solve" className="flex items-center gap-3">
              <Calculator className="w-6 h-6" />
              <div className="text-left">
                <div className="font-semibold">Nova dúvida</div>
                <div className="text-xs opacity-80">Resolver um exercício agora</div>
              </div>
            </Link>
          </Button>
          <Button variant="hero-outline" size="lg" asChild className="h-auto py-5 justify-start">
            <Link to="/chat" className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6" />
              <div className="text-left">
                <div className="font-semibold">Falar com o Tutor</div>
                <div className="text-xs opacity-80">Tirar dúvidas em conversa</div>
              </div>
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Target, label: "Exercícios resolvidos", value: isLoading ? "—" : String(stats.total), color: "text-primary" },
            { icon: Flame, label: "Dias seguidos a estudar", value: isLoading ? "—" : `${stats.streak} ${stats.streak === 1 ? "dia" : "dias"}`, color: "text-accent" },
            { icon: CalendarDays, label: "Exercícios esta semana", value: isLoading ? "—" : String(stats.thisWeek), color: "text-math" },
            { icon: Award, label: "Temas diferentes", value: isLoading ? "—" : String(stats.topics), color: "text-success" },
          ].map((s, i) => (
            <motion.div key={i} className="bg-card rounded-xl p-5 shadow-card border border-border/50" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Subject change card (only for free users) */}
        <div className="mb-6">
          <SubjectChangeCard />
        </div>

        {isEmpty ? (
          <motion.div
            className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Ainda não resolveste nenhum exercício</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Envia o primeiro exercício — escrito ou por foto — e o teu progresso, histórico e recomendações
              começam a aparecer aqui.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" asChild>
                <Link to="/solve"><Calculator className="w-4 h-4" /> Resolver o primeiro exercício</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/chat"><MessageCircle className="w-4 h-4" /> Fazer uma pergunta ao Tutor</Link>
              </Button>
            </div>
          </motion.div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-muted-foreground" /> Últimas dúvidas</h2>
              <Link to="/history" className="text-sm text-primary hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">A carregar…</p>
              ) : recent.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{attemptTitle(e)}</div>
                    <div className="text-xs text-muted-foreground">{e.subject || "—"} · {relativeTime(e.created_at)}</div>
                  </div>
                  {e.difficulty && (
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${difficultyClass(e.difficulty)}`}>{e.difficulty}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-accent" /> Recomendações para ti</h2>
            <div className="space-y-3">
              {lastWithTopic ? (
                <Link to="/solve" className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                  <div>
                    <div className="font-medium text-sm">{lastWithTopic.topic}</div>
                    <div className="text-xs text-muted-foreground">{lastWithTopic.subject || "—"} · Continuar do último tema</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ) : null}
              <Link to="/chat" className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                <div>
                  <div className="font-medium text-sm">Rever com o Tutor</div>
                  <div className="text-xs text-muted-foreground">Pede outra explicação de um passo difícil</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          {/* Exercises by subject */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 lg:col-span-2">
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-muted-foreground" /> Exercícios por disciplina</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleSubjects.map((name) => {
                const count = subjectCount(stats, name);
                return (
                  <div key={name} className="p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{name}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden mb-2">
                      <div className={`h-full rounded-full ${subjectColors[name]} transition-all`} style={{ width: `${(count / maxBySubject) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {count === 0 ? "Ainda sem exercícios" : `${count} ${count === 1 ? "exercício resolvido" : "exercícios resolvidos"}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>
    </AppLayout>
  );
}
