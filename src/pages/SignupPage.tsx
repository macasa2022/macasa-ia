import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Brain, Eye, EyeOff, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const years = ["7º ano", "8º ano", "9º ano", "10º ano", "11º ano", "12º ano"];
const subjects = ["Matemática", "Física", "Química"];
const goals = ["Melhorar notas", "Preparar exames", "Perceber a matéria", "Praticar exercícios", "Ser mais autónomo"];
const frequencies = ["Todos os dias", "3-4 vezes por semana", "1-2 vezes por semana", "Quando precisar"];

export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedFreq, setSelectedFreq] = useState("");
  const navigate = useNavigate();

  const toggleSubject = (s: string) => setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSignup = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 3 || !/[a-zA-ZÀ-ÿ]/.test(trimmedName)) {
      toast.error("Introduz um nome válido (mínimo 3 letras).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Introduz um email válido.");
      return;
    }
    if (password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user) {
      setStep(1);
    }
  };

  const saveOnboarding = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          ano_escolar: selectedYear,
          disciplinas_favoritas: selectedSubjects,
          objetivo_estudo: selectedGoal,
          frequencia_estudo: selectedFreq,
        })
        .eq("user_id", user.id);
    }
    setLoading(false);
    navigate("/dashboard");
  };

  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">MACASA IA</span>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Cria a tua conta</h1>
            <p className="text-muted-foreground text-sm">Começa a aprender de forma inteligente.</p>
          </div>
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="O teu nome" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="o.teu@email.com" className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPw ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button variant="hero" className="w-full" onClick={handleSignup} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Criar conta <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tens conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    );
  }

  const onboardingSteps = [
    {
      title: "Qual é o teu ano escolar?",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {years.map(y => (
            <button key={y} onClick={() => setSelectedYear(y)} className={`p-4 rounded-xl border text-sm font-medium transition-all ${selectedYear === y ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>
              {y}
            </button>
          ))}
        </div>
      ),
      valid: !!selectedYear,
    },
    {
      title: "Quais as disciplinas com mais dificuldade?",
      content: (
        <div className="grid grid-cols-1 gap-3">
          {subjects.map(s => (
            <button key={s} onClick={() => toggleSubject(s)} className={`p-4 rounded-xl border text-sm font-medium transition-all text-left flex items-center justify-between ${selectedSubjects.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>
              {s} {selectedSubjects.includes(s) && <CheckCircle2 className="w-5 h-5" />}
            </button>
          ))}
        </div>
      ),
      valid: selectedSubjects.length > 0,
    },
    {
      title: "Qual é o teu objetivo principal?",
      content: (
        <div className="grid grid-cols-1 gap-3">
          {goals.map(g => (
            <button key={g} onClick={() => setSelectedGoal(g)} className={`p-4 rounded-xl border text-sm font-medium transition-all text-left ${selectedGoal === g ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>
              {g}
            </button>
          ))}
        </div>
      ),
      valid: !!selectedGoal,
    },
    {
      title: "Com que frequência queres estudar?",
      content: (
        <div className="grid grid-cols-1 gap-3">
          {frequencies.map(f => (
            <button key={f} onClick={() => setSelectedFreq(f)} className={`p-4 rounded-xl border text-sm font-medium transition-all text-left ${selectedFreq === f ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>
              {f}
            </button>
          ))}
        </div>
      ),
      valid: !!selectedFreq,
    },
  ];

  const currentStep = onboardingSteps[step - 1];
  const isLast = step === onboardingSteps.length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            {onboardingSteps.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i < step ? "w-8 bg-primary" : i === step - 1 ? "w-8 bg-primary" : "w-8 bg-border"}`} />
            ))}
          </div>
          <h1 className="text-2xl font-bold mb-2">{currentStep.title}</h1>
          <p className="text-muted-foreground text-sm">Passo {step} de {onboardingSteps.length}</p>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50">
          {currentStep.content}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Button>
            {isLast ? (
              <Button variant="hero" className="flex-1" onClick={saveOnboarding} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Começar a aprender!
              </Button>
            ) : (
              <Button variant="hero" className="flex-1" onClick={() => setStep(step + 1)} disabled={!currentStep.valid}>
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
