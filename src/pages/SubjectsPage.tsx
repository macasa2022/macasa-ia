import AppLayout from "@/components/AppLayout";
import { Calculator, Atom, FlaskConical, ChevronRight, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

function getYearLevel(anoEscolar: string | null | undefined): string | null {
  if (!anoEscolar) return null;
  const match = anoEscolar.match(/(\d+)/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (year >= 7 && year <= 9) return "7º-9º";
  if (year >= 10 && year <= 12) return "10º-12º";
  return null;
}

export default function SubjectsPage() {
  const { profile, user } = useAuth();
  const [activeSubject, setActiveSubject] = useState(0);

  const userPlan = String(
    user?.app_metadata?.plan ??
    user?.user_metadata?.plan ??
    user?.app_metadata?.account_type ??
    user?.user_metadata?.account_type ??
    ""
  ).toLowerCase();
  const isPremium = userPlan.includes("premium") || userPlan.includes("escola") || userPlan.includes("school");

  const userDisciplinas = profile?.disciplinas_favoritas?.filter(d =>
    subjectsData.some(s => s.name === d)
  ) || [];

  const visibleSubjects = useMemo(() => {
    if (isPremium) return subjectsData;
    if (userDisciplinas.length > 0) {
      return subjectsData.filter(s => userDisciplinas.includes(s.name));
    }
    return subjectsData;
  }, [isPremium, userDisciplinas]);

  const userYearLevel = getYearLevel(profile?.ano_escolar);

  const s = visibleSubjects[activeSubject] || visibleSubjects[0];
  if (!s) return null;

  const filteredYears = useMemo(() => {
    if (isPremium || !userYearLevel) return Object.entries(s.years);
    return Object.entries(s.years).filter(([level]) => level === userYearLevel);
  }, [isPremium, userYearLevel, s]);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Disciplinas</h1>
          <p className="text-muted-foreground mb-6">Explora tópicos por disciplina e ano escolar.</p>
        </motion.div>

        {visibleSubjects.length > 1 && (
          <div className="flex gap-3 mb-6">
            {visibleSubjects.map((sub, i) => (
              <button key={i} onClick={() => setActiveSubject(i)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSubject === i ? `${sub.bg} ${sub.color} border border-current/20` : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                <sub.icon className="w-4 h-4" /> {sub.name}
              </button>
            ))}
          </div>
        )}

        {visibleSubjects.length === 1 && (
          <div className="flex items-center gap-2 mb-6">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <span className="font-semibold text-lg">{s.name}</span>
          </div>
        )}

        {filteredYears.map(([level, topics]) => (
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

        {!isPremium && (
          <motion.div className="mt-8 p-6 bg-card rounded-xl border border-border/50 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Queres aceder a todas as disciplinas e níveis? Faz upgrade para Premium.</p>
            <Button variant="hero" asChild>
              <Link to="/pricing">Ver planos</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
