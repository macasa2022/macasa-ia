import AppLayout from "@/components/AppLayout";
import { Calendar, CheckCircle2, Clock, Target, BookOpen, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const weekPlan = [
  { day: "Segunda", tasks: [{ topic: "Equações 2º grau", subject: "Mat", done: true }, { topic: "Leis de Newton", subject: "Fís", done: false }] },
  { day: "Terça", tasks: [{ topic: "Estequiometria", subject: "Quím", done: false }] },
  { day: "Quarta", tasks: [{ topic: "Funções quadráticas", subject: "Mat", done: false }, { topic: "Energia cinética", subject: "Fís", done: false }] },
  { day: "Quinta", tasks: [{ topic: "pH e soluções", subject: "Quím", done: false }] },
  { day: "Sexta", tasks: [{ topic: "Trigonometria", subject: "Mat", done: false }] },
  { day: "Sábado", tasks: [{ topic: "Revisão geral", subject: "Todas", done: false }] },
];

const priorities = [
  { topic: "Equações do 2º grau", subject: "Matemática", urgency: "Alta", reason: "Tema com maior dificuldade recente" },
  { topic: "Estequiometria", subject: "Química", urgency: "Média", reason: "Tema frequente em exames" },
  { topic: "Cinemática", subject: "Física", urgency: "Média", reason: "Novo tópico no programa" },
];

export default function StudyPlanPage() {
  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Plano de Estudo</h1>
          <p className="text-muted-foreground mb-6">Plano semanal personalizado com base no teu progresso.</p>
        </motion.div>

        {/* Goals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <Target className="w-5 h-5 text-primary mb-2" />
            <div className="text-2xl font-bold">12</div>
            <div className="text-xs text-muted-foreground">Tópicos para esta semana</div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <CheckCircle2 className="w-5 h-5 text-success mb-2" />
            <div className="text-2xl font-bold">1/12</div>
            <div className="text-xs text-muted-foreground">Concluídos</div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <Clock className="w-5 h-5 text-accent mb-2" />
            <div className="text-2xl font-bold">~6h</div>
            <div className="text-xs text-muted-foreground">Tempo estimado restante</div>
          </div>
        </div>

        {/* Weekly plan */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-primary" /> Plano Semanal</h2>
          <div className="space-y-3">
            {weekPlan.map((day, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50">
                <div className="w-20 text-sm font-semibold text-muted-foreground pt-0.5">{day.day}</div>
                <div className="flex-1 space-y-2">
                  {day.tasks.map((t, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${t.done ? "bg-success border-success" : "border-border"}`}>
                        {t.done && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.topic}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t.subject}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priorities */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-warning" /> Tópicos Prioritários</h2>
          <div className="space-y-3">
            {priorities.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <div className="font-medium text-sm">{p.topic}</div>
                  <div className="text-xs text-muted-foreground">{p.subject} · {p.reason}</div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.urgency === "Alta" ? "bg-destructive/10 text-destructive" : "bg-warning-light text-warning"}`}>{p.urgency}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
