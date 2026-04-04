import AppLayout from "@/components/AppLayout";
import { Calculator, Atom, FlaskConical, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const subjectsData = [
  {
    name: "Matemática", icon: Calculator, color: "text-math", bg: "bg-math-light", gradient: "bg-gradient-math",
    years: {
      "7º-9º": ["Números e operações", "Frações e decimais", "Potências", "Equações 1º grau", "Proporções", "Geometria básica", "Estatística", "Probabilidade"],
      "10º-12º": ["Funções", "Equações 2º grau", "Sistemas de equações", "Trigonometria", "Geometria analítica", "Derivadas", "Limites", "Sequências e progressões"],
    },
  },
  {
    name: "Física", icon: Atom, color: "text-physics", bg: "bg-physics-light", gradient: "bg-gradient-physics",
    years: {
      "7º-9º": ["Movimento", "Velocidade", "Forças", "Energia", "Calor e temperatura", "Eletricidade básica", "Ondas e som", "Luz e óptica"],
      "10º-12º": ["Cinemática", "Dinâmica", "Trabalho e energia", "Impulso e momento", "Gravitação", "Circuitos elétricos", "Campo magnético", "Física moderna"],
    },
  },
  {
    name: "Química", icon: FlaskConical, color: "text-chemistry", bg: "bg-chemistry-light", gradient: "bg-gradient-chemistry",
    years: {
      "7º-9º": ["Estrutura atómica", "Tabela periódica", "Ligações químicas", "Reações químicas", "Balanceamento", "Misturas e soluções", "Ácidos e bases", "pH"],
      "10º-12º": ["Massa molar e mol", "Estequiometria", "Soluções e concentração", "Cinética química", "Equilíbrio químico", "Eletroquímica", "Química orgânica", "Gases"],
    },
  },
];

export default function SubjectsPage() {
  const [activeSubject, setActiveSubject] = useState(0);
  const s = subjectsData[activeSubject];
  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Disciplinas</h1>
          <p className="text-muted-foreground mb-6">Explora tópicos por disciplina e ano escolar.</p>
        </motion.div>

        <div className="flex gap-3 mb-6">
          {subjectsData.map((sub, i) => (
            <button key={i} onClick={() => setActiveSubject(i)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSubject === i ? `${sub.bg} ${sub.color} border border-current/20` : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
              <sub.icon className="w-4 h-4" /> {sub.name}
            </button>
          ))}
        </div>

        {Object.entries(s.years).map(([level, topics]) => (
          <div key={level} className="mb-6">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.color}`}>{level}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topics.map((t, j) => (
                <motion.div key={j} className="bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: j * 0.05 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
