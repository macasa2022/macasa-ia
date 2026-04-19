import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Calculator, MessageCircle, TrendingUp, BookOpen, Flame, Target, Clock, Sparkles, ArrowRight, Award, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const recentExercises = [
  { subject: "Matemática", topic: "Equações do 2º grau", time: "Há 2h", difficulty: "Médio" },
  { subject: "Física", topic: "Movimento retilíneo uniforme", time: "Há 5h", difficulty: "Fácil" },
  { subject: "Química", topic: "Balanceamento de reações", time: "Ontem", difficulty: "Difícil" },
];

const recommendations = [
  { subject: "Matemática", topic: "Funções quadráticas", reason: "Continuar do último tópico" },
  { subject: "Física", topic: "Leis de Newton", reason: "Tema frequente em exames" },
  { subject: "Química", topic: "Estequiometria", reason: "Área com mais dificuldade" },
];

const allSubjectsProgress = [
  { name: "Matemática", progress: 65, exercises: 82, color: "bg-math" },
  { name: "Física", progress: 42, exercises: 38, color: "bg-physics" },
  { name: "Química", progress: 28, exercises: 27, color: "bg-chemistry" },
];

export default function DashboardPage() {
  const { profile, isAdmin, isPremium } = useAuth();
  const displayName = profile?.nome?.trim() || "";

  const isFreeUser = !isAdmin && !isPremium;
  const enrolledSubjects = profile?.disciplinas_favoritas ?? [];

  const visibleRecent = isFreeUser
    ? recentExercises.filter(e => enrolledSubjects.includes(e.subject))
    : recentExercises;
  const visibleRecommendations = isFreeUser
    ? recommendations.filter(r => enrolledSubjects.includes(r.subject))
    : recommendations;
  const visibleProgress = isFreeUser
    ? allSubjectsProgress.filter(s => enrolledSubjects.includes(s.name))
    : allSubjectsProgress;

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
            { icon: Target, label: "Exercícios resolvidos", value: "147", color: "text-primary" },
            { icon: Flame, label: "Streak de estudo", value: "12 dias", color: "text-accent" },
            { icon: Clock, label: "Tempo esta semana", value: "4h 30m", color: "text-math" },
            { icon: Award, label: "Taxa de acerto", value: "78%", color: "text-success" },
          ].map((s, i) => (
            <motion.div key={i} className="bg-card rounded-xl p-5 shadow-card border border-border/50" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-muted-foreground" /> Últimas dúvidas</h2>
              <Link to="/history" className="text-sm text-primary hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="space-y-3">
              {visibleRecent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem dúvidas recentes.</p>
              ) : visibleRecent.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div>
                    <div className="font-medium text-sm">{e.topic}</div>
                    <div className="text-xs text-muted-foreground">{e.subject} · {e.time}</div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${e.difficulty === "Fácil" ? "bg-success-light text-success" : e.difficulty === "Médio" ? "bg-warning-light text-warning" : "bg-destructive/10 text-destructive"}`}>{e.difficulty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-accent" /> Recomendações para ti</h2>
            <div className="space-y-3">
              {visibleRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem recomendações disponíveis.</p>
              ) : visibleRecommendations.map((r, i) => (
                <Link to="/solve" key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                  <div>
                    <div className="font-medium text-sm">{r.topic}</div>
                    <div className="text-xs text-muted-foreground">{r.subject} · {r.reason}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Progress by subject */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 lg:col-span-2">
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-muted-foreground" /> Progresso por disciplina</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 md:col-span-3">Sem dados de progresso ainda.</p>
              ) : visibleProgress.map((s, i) => (
                <div key={i} className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{s.name}</span>
                    <span className="text-sm text-muted-foreground">{s.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{s.exercises} exercícios resolvidos</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
