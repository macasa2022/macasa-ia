import AppLayout from "@/components/AppLayout";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Upload, BookOpen, Atom, FlaskConical, Sparkles, Loader2, Brain, Lightbulb, GraduationCap, Dumbbell, Eye, RotateCcw, Bookmark, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { solveExercise } from "@/lib/ai-stream";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import AnalysisSummaryCard from "@/components/solve/AnalysisSummaryCard";
import StrategyThinkingCard from "@/components/solve/StrategyThinkingCard";
import StepByStepSolution from "@/components/solve/StepByStepSolution";
import ValidationSummaryCard from "@/components/solve/ValidationSummaryCard";
import PracticeNextCard from "@/components/solve/PracticeNextCard";
import HintInteractionCard from "@/components/solve/HintInteractionCard";
import ProfessorModeBlock from "@/components/solve/ProfessorModeBlock";

const subjects = [
  { id: "Matemática", icon: BookOpen, color: "text-blue-600 dark:text-blue-400" },
  { id: "Física", icon: Atom, color: "text-emerald-600 dark:text-emerald-400" },
  { id: "Química", icon: FlaskConical, color: "text-purple-600 dark:text-purple-400" },
];

const years = ["7º ano", "8º ano", "9º ano", "10º ano", "11º ano", "12º ano"];

const modes = [
  { id: "solve_resolve", label: "Resolver", icon: Calculator, desc: "Resolução completa passo a passo" },
  { id: "solve_explain", label: "Explicar", icon: Eye, desc: "Foco na compreensão e aprendizagem" },
  { id: "solve_hint", label: "Pista", icon: Lightbulb, desc: "Orientação sem dar a resposta" },
  { id: "solve_training", label: "Treino", icon: Dumbbell, desc: "Pratica passo a passo" },
  { id: "solve_professor", label: "Professor", icon: GraduationCap, desc: "Explicação académica e rigorosa" },
];

const exampleExercises = [
  { subject: "Matemática", text: "Resolve a equação 3x + 5 = 20" },
  { subject: "Matemática", text: "Determina a área de um triângulo com base 8 cm e altura 5 cm" },
  { subject: "Física", text: "Um carro acelera de 0 a 20 m/s em 5 segundos. Calcula a aceleração." },
  { subject: "Física", text: "Determina a força resultante sobre um corpo de 10 kg com aceleração de 2 m/s²." },
  { subject: "Química", text: "Calcula a massa molar da água (H₂O)." },
  { subject: "Química", text: "Balanceia a equação: H₂ + O₂ → H₂O" },
];

const loadingSteps = [
  "A identificar o tema…",
  "A interpretar o enunciado…",
  "A organizar a melhor estratégia…",
  "A preparar explicação passo a passo…",
];

type SolveResult = {
  analysis?: any;
  strategy?: any;
  solution?: any;
  practice?: any;
};

export default function SolvePage() {
  const { profile, isAdmin, isPremium } = useAuth();
  const { isOnCooldown, isLimited, showWarning, remaining, recordQuestion, getCooldownTimeLeft } = useUsageLimit();
  
  // For free non-admin users, lock to their enrolled discipline
  const enrolledSubject = (!isAdmin && !isPremium && profile?.disciplinas_favoritas?.length)
    ? profile.disciplinas_favoritas[0]
    : null;
  
  const visibleSubjects = enrolledSubject
    ? subjects.filter(s => s.id === enrolledSubject)
    : subjects;

  const [exercise, setExercise] = useState("");
  const [subject, setSubject] = useState(enrolledSubject || "");
  const [year, setYear] = useState(profile?.ano_escolar || "");

  // Sync subject/year when profile loads asynchronously
  useEffect(() => {
    if (enrolledSubject) setSubject(enrolledSubject);
  }, [enrolledSubject]);
  useEffect(() => {
    if (profile?.ano_escolar && !year) setYear(profile.ano_escolar);
  }, [profile?.ano_escolar]);
  const [mode, setMode] = useState("solve_resolve");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<SolveResult>({});
  const [hasResult, setHasResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleSolve = async (exerciseText?: string) => {
    const text = exerciseText || exercise;
    if (!text.trim()) { toast.error("Escreve um exercício primeiro."); return; }

    setLoading(true);
    setHasResult(false);
    setResult({});
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      if (isLimited) {
        const { allowed, warning, remaining: rem } = await recordQuestion();
        if (!allowed) {
          toast.error("Atingiste o limite de perguntas. Aguarda 20 horas para continuar.");
          setLoading(false);
          clearInterval(interval);
          return;
        }
        if (warning) {
          toast.warning(`Atenção: só te restam ${rem} ocasiões para perguntar ou resolver exercícios.`);
        }
      }

      const analysis = await solveExercise({ exercise: text, mode: "solve_analyze", year, subject });
      setResult(prev => ({ ...prev, analysis }));

      const strategy = await solveExercise({ exercise: text, mode: "solve_strategy", year, subject });
      setResult(prev => ({ ...prev, strategy }));

      const solution = await solveExercise({ exercise: text, mode, year, subject });
      setResult(prev => ({ ...prev, solution }));

      if (["solve_resolve", "solve_explain", "solve_professor"].includes(mode)) {
        const practice = await solveExercise({ exercise: text, mode: "solve_practice", year, subject });
        setResult(prev => ({ ...prev, practice }));
      }

      setHasResult(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    } catch (err: any) {
      toast.error(err.message || "Erro ao resolver o exercício.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleTryExercise = (text: string) => {
    setExercise(text);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => handleSolve(text), 300);
  };

  const currentMode = modes.find(m => m.id === mode)!;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Resolver Exercício</h1>
              <p className="text-xs text-muted-foreground">Aprende a pensar. Não apenas a responder.</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap gap-2 mb-4">
          {visibleSubjects.map(s => (
            <button key={s.id} onClick={() => !enrolledSubject && setSubject(subject === s.id ? "" : s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${subject === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"} ${enrolledSubject ? "cursor-default" : ""}`}>
              <s.icon className="w-4 h-4" /> {s.id}
            </button>
          ))}
          <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground">
            <option value="">Ano escolar</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {modes.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
              <m.icon className="w-3.5 h-3.5" /> {m.label}
            </button>
          ))}
        </motion.div>

        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
          <currentMode.icon className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{currentMode.label}:</span> {currentMode.desc}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden mb-6">
          <textarea value={exercise} onChange={(e) => setExercise(e.target.value)}
            placeholder="Escreve ou cola aqui o teu exercício... Ex: Resolve a equação 3x + 5 = 20"
            className="w-full p-4 bg-transparent resize-none min-h-[120px] text-sm focus:outline-none placeholder:text-muted-foreground/50" rows={4} />
          <div className="flex items-center justify-between p-3 border-t border-border/30">
            <Button variant="outline" size="sm" className="text-xs gap-1.5"><Upload className="w-3.5 h-3.5" /> Imagem</Button>
            <Button variant="hero" size="sm" onClick={() => handleSolve()} disabled={loading || !exercise.trim() || isOnCooldown} className="gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "A analisar…" : "Analisar Exercício"}
            </Button>
          </div>
        </motion.div>

        {isOnCooldown && (
          <Alert className="mb-4 border-amber-500/30 bg-amber-500/5">
            <Clock className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              Atingiste o limite de 5 perguntas. Poderás voltar a usar em <strong>{getCooldownTimeLeft()}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {showWarning && (
          <Alert className="mb-4 border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              Atenção: só te restam <strong>{remaining}</strong> ocasiões para perguntar ou resolver exercícios.
            </AlertDescription>
          </Alert>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-6 space-y-2">
              {loadingSteps.map((step, i) => (
                <motion.div key={step} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= loadingStep ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
                  {i < loadingStep ? (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Sparkles className="w-3 h-3 text-primary-foreground" /></div>
                  ) : i === loadingStep ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-border" />
                  )}
                  <span className={`text-sm ${i <= loadingStep ? "font-medium" : "text-muted-foreground"}`}>{step}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={resultRef} className="space-y-4">
          {result.analysis && !result.analysis.raw && <AnalysisSummaryCard data={result.analysis} />}
          {result.strategy && !result.strategy.raw && <StrategyThinkingCard data={result.strategy} />}
          {result.solution && (
            <>
              {mode === "solve_hint" && <HintInteractionCard data={result.solution} />}
              {mode === "solve_professor" && <ProfessorModeBlock data={result.solution} />}
              {mode === "solve_training" && result.solution.exercicio_treino && <TrainingFlowPanel data={result.solution} />}
              {["solve_resolve", "solve_explain"].includes(mode) && result.solution.passos && (
                <>
                  <StepByStepSolution steps={result.solution.passos} />
                  <ValidationSummaryCard data={result.solution} />
                </>
              )}
            </>
          )}
          {result.practice && <PracticeNextCard data={result.practice} onTryExercise={handleTryExercise} />}
          {hasResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 mt-4 pb-4">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setResult({}); setHasResult(false); setExercise(""); }}>
                <RotateCcw className="w-3.5 h-3.5" /> Novo exercício
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Bookmark className="w-3.5 h-3.5" /> Guardar</Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"><CalendarPlus className="w-3.5 h-3.5" /> Plano de estudo</Button>
            </motion.div>
          )}
        </div>

        {!hasResult && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">💡 Experimenta com estes exercícios:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {exampleExercises.filter(ex => !subject || ex.subject === subject).map((ex, i) => (
                <button key={i} onClick={() => { setExercise(ex.text); setSubject(ex.subject); }}
                  className="text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm">
                  <Badge variant="outline" className="text-[10px] mb-1">{ex.subject}</Badge>
                  <p className="line-clamp-2">{ex.text}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

function TrainingFlowPanel({ data }: { data: any }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const steps = data.etapas_esperadas || [];
  const step = steps[currentStep];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-green-500/5 to-primary/5">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="font-semibold text-sm">Modo Treino — Tenta Resolver</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{data.exercicio_treino}</p>
      </div>
      <div className="p-4">
        <div className="flex gap-1 mb-4">
          {steps.map((_: any, i: number) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= currentStep ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        {step && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Etapa {step.numero}: {step.descricao}</div>
            <textarea value={userAnswers[currentStep] || ""} onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentStep]: e.target.value }))}
              placeholder="Escreve a tua resposta..." className="w-full p-3 bg-secondary/50 rounded-lg border border-border text-sm resize-none min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setRevealed(prev => ({ ...prev, [currentStep]: true }))}>Verificar</Button>
              {revealed[currentStep] && currentStep < steps.length - 1 && (
                <Button size="sm" variant="outline" onClick={() => setCurrentStep(prev => prev + 1)}>Próxima etapa →</Button>
              )}
            </div>
            {revealed[currentStep] && (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">✅ RESPOSTA ESPERADA</div>
                  <p className="text-sm">{step.resposta_correta}</p>
                </div>
                {step.dica_se_errar && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">💡 DICA</div>
                    <p className="text-sm">{step.dica_se_errar}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
