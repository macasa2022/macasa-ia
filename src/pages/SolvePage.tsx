import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Upload, Camera, Send, Brain, Lightbulb, BookOpen, Target, GraduationCap, CheckCircle2, AlertTriangle, ArrowRight, Calculator, Atom, FlaskConical, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const modes = [
  { id: "explicar", label: "Explicar", icon: BookOpen, desc: "Foco total na aprendizagem" },
  { id: "resolver", label: "Resolver", icon: Calculator, desc: "Resolução completa passo a passo" },
  { id: "pista", label: "Pista", icon: Lightbulb, desc: "Dicas sem entregar a resposta" },
  { id: "treino", label: "Treino", icon: Target, desc: "Tu tentas, a IA corrige" },
  { id: "professor", label: "Professor", icon: GraduationCap, desc: "Explicação formal e detalhada" },
];

const mockSolution = {
  subject: "Matemática",
  topic: "Equações do 2º grau",
  difficulty: "Médio",
  year: "9º ano",
  thinking: "Este exercício pede-nos para encontrar os valores de x que satisfazem uma equação quadrática. A primeira coisa a observar é que se trata de uma equação do 2º grau, porque o maior expoente de x é 2.",
  commonErrors: "Muitos alunos esquecem-se de considerar as duas soluções (positiva e negativa) da raiz quadrada.",
  data: [
    { label: "Equação", value: "x² - 5x + 6 = 0" },
    { label: "Tipo", value: "Equação quadrática completa" },
    { label: "Coeficientes", value: "a=1, b=-5, c=6" },
  ],
  steps: [
    {
      num: 1,
      title: "Identificar os coeficientes",
      content: "Na equação ax² + bx + c = 0, identificamos: a = 1, b = -5, c = 6",
      why: "Precisamos destes valores para aplicar a fórmula resolvente.",
      formula: "ax² + bx + c = 0",
    },
    {
      num: 2,
      title: "Calcular o discriminante (Δ)",
      content: "Δ = b² - 4ac = (-5)² - 4(1)(6) = 25 - 24 = 1",
      why: "O discriminante diz-nos quantas soluções reais a equação tem. Se Δ > 0, há duas soluções.",
      formula: "Δ = b² - 4ac",
    },
    {
      num: 3,
      title: "Aplicar a fórmula resolvente",
      content: "x = (-b ± √Δ) / (2a) = (5 ± √1) / 2 = (5 ± 1) / 2",
      why: "Esta fórmula dá-nos as soluções de qualquer equação do 2º grau.",
      formula: "x = (-b ± √Δ) / (2a)",
    },
    {
      num: 4,
      title: "Calcular as duas soluções",
      content: "x₁ = (5 + 1) / 2 = 3 e x₂ = (5 - 1) / 2 = 2",
      why: "Substituímos ± por + e - para obter as duas soluções.",
      formula: null,
    },
  ],
  answer: "x = 3 ou x = 2",
  verification: "Verificação: 3² - 5(3) + 6 = 9 - 15 + 6 = 0 ✓ e 2² - 5(2) + 6 = 4 - 10 + 6 = 0 ✓",
  interpretation: "A equação tem duas soluções reais e distintas, o que faz sentido porque o discriminante é positivo (Δ = 1 > 0).",
  practice: [
    "x² - 7x + 12 = 0",
    "x² + 3x - 10 = 0",
    "2x² - 8x + 6 = 0",
    "x² - 4 = 0 (mais fácil)",
    "x² - 6x + 9 = 0 (mais difícil — raiz dupla)",
  ],
};

export default function SolvePage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("explicar");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const handleSolve = () => {
    if (input.trim()) setShowSolution(true);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Resolver Exercício</h1>
          <p className="text-muted-foreground mb-6">Escreve, cola ou envia uma foto do exercício.</p>
        </motion.div>

        {/* Input area */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escreve o teu exercício aqui... Ex: Resolve a equação x² - 5x + 6 = 0"
            className="w-full min-h-[120px] bg-transparent resize-none text-sm focus:outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="w-4 h-4" /> Imagem
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Camera className="w-4 h-4" /> Foto
            </Button>
            <div className="flex-1" />
            <select value={subject} onChange={e => setSubject(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
              <option value="">Disciplina</option>
              <option>Matemática</option>
              <option>Física</option>
              <option>Química</option>
            </select>
            <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
              <option value="">Ano</option>
              {["7º", "8º", "9º", "10º", "11º", "12º"].map(y => <option key={y}>{y} ano</option>)}
            </select>
          </div>

          {/* Modes */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-3">Modo de ajuda:</div>
            <div className="flex flex-wrap gap-2">
              {modes.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m.id ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent"}`}>
                  <m.icon className="w-4 h-4" /> {m.label}
                </button>
              ))}
            </div>
          </div>

          <Button variant="hero" className="w-full mt-5" onClick={handleSolve} disabled={!input.trim()}>
            <Brain className="w-5 h-5" /> Analisar exercício
          </Button>
        </div>

        {/* Solution */}
        <AnimatePresence>
          {showSolution && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Classification */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-math-light text-math text-xs font-medium">{mockSolution.subject}</span>
                  <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">{mockSolution.topic}</span>
                  <span className="px-3 py-1 rounded-full bg-warning-light text-warning text-xs font-medium">{mockSolution.difficulty}</span>
                  <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">{mockSolution.year}</span>
                </div>

                {/* How to think */}
                <div className="bg-primary/5 rounded-lg p-4 mb-4 border border-primary/10">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2"><Brain className="w-4 h-4" /> Como pensar neste exercício</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{mockSolution.thinking}</p>
                </div>

                {/* Common errors */}
                <div className="bg-warning-light rounded-lg p-4 border border-warning/10">
                  <div className="flex items-center gap-2 text-warning font-semibold text-sm mb-2"><AlertTriangle className="w-4 h-4" /> Erros comuns</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{mockSolution.commonErrors}</p>
                </div>
              </div>

              {/* Data */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Dados do problema</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {mockSolution.data.map((d, i) => (
                    <div key={i} className="bg-secondary/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">{d.label}</div>
                      <div className="font-mono font-semibold text-sm mt-1">{d.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Resolução passo a passo</h3>
                <div className="space-y-3">
                  {mockSolution.steps.map((s, i) => (
                    <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
                      <button onClick={() => setExpandedStep(expandedStep === i ? null : i)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">{s.num}</div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{s.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">{s.content}</div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedStep === i ? "rotate-180" : ""}`} />
                      </button>
                      {expandedStep === i && (
                        <div className="px-4 pb-4 pt-0 ml-11 space-y-2">
                          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                            <div className="text-xs font-medium text-primary mb-1">Porquê?</div>
                            <p className="text-sm text-muted-foreground">{s.why}</p>
                          </div>
                          {s.formula && (
                            <div className="bg-secondary rounded-lg p-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Fórmula</div>
                              <p className="text-sm font-mono font-semibold">{s.formula}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer */}
              <div className="bg-gradient-hero rounded-xl p-6 text-primary-foreground">
                <div className="flex items-center gap-2 font-semibold mb-2"><CheckCircle2 className="w-5 h-5" /> Resposta Final</div>
                <div className="text-2xl font-bold font-mono mb-3">{mockSolution.answer}</div>
                <div className="text-sm opacity-90 mb-2">{mockSolution.verification}</div>
                <div className="text-sm opacity-80">{mockSolution.interpretation}</div>
              </div>

              {/* Practice */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent" /> Pratica mais</h3>
                <div className="space-y-2">
                  {mockSolution.practice.map((p, i) => (
                    <button key={i} className="w-full text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors flex items-center justify-between group">
                      <span className="text-sm font-mono">{p}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
