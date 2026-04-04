import AppLayout from "@/components/AppLayout";
import { Clock, BarChart3, TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";

const historyItems = [
  { topic: "Equações do 2º grau", subject: "Matemática", date: "Hoje, 14:30", mode: "Explicar", correct: true },
  { topic: "Movimento retilíneo uniforme", subject: "Física", date: "Hoje, 10:15", mode: "Resolver", correct: true },
  { topic: "Balanceamento de reações", subject: "Química", date: "Ontem, 18:00", mode: "Treino", correct: false },
  { topic: "Sistemas de equações", subject: "Matemática", date: "Ontem, 15:30", mode: "Explicar", correct: true },
  { topic: "Leis de Newton", subject: "Física", date: "3 dias atrás", mode: "Pista", correct: true },
  { topic: "Tabela periódica", subject: "Química", date: "4 dias atrás", mode: "Professor", correct: true },
  { topic: "Funções lineares", subject: "Matemática", date: "5 dias atrás", mode: "Resolver", correct: false },
  { topic: "Energia cinética", subject: "Física", date: "1 semana atrás", mode: "Treino", correct: true },
];

const weeklyData = [
  { day: "Seg", exercises: 5 },
  { day: "Ter", exercises: 3 },
  { day: "Qua", exercises: 7 },
  { day: "Qui", exercises: 2 },
  { day: "Sex", exercises: 6 },
  { day: "Sáb", exercises: 4 },
  { day: "Dom", exercises: 1 },
];

const maxExercises = Math.max(...weeklyData.map(d => d.exercises));

export default function HistoryPage() {
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
            { icon: Target, label: "Total de exercícios", value: "147" },
            { icon: TrendingUp, label: "Taxa de acerto", value: "78%" },
            { icon: Clock, label: "Tempo total", value: "32h" },
            { icon: BarChart3, label: "Esta semana", value: "28" },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <s.icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Weekly chart */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-lg mb-4">Evolução semanal</h2>
          <div className="flex items-end gap-3 h-32">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-medium text-muted-foreground">{d.exercises}</div>
                <div className="w-full bg-primary/20 rounded-t-md relative" style={{ height: `${(d.exercises / maxExercises) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-hero rounded-t-md" />
                </div>
                <div className="text-xs text-muted-foreground">{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* History list */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h2 className="font-semibold text-lg mb-4">Últimos exercícios</h2>
          <div className="space-y-2">
            {historyItems.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${h.correct ? "bg-success" : "bg-destructive"}`} />
                  <div>
                    <div className="font-medium text-sm">{h.topic}</div>
                    <div className="text-xs text-muted-foreground">{h.subject} · {h.date}</div>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{h.mode}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
