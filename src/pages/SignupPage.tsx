import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Brain, Eye, EyeOff, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const toggleSubject = (s: string) => setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [s]);

  // Step 0: credentials form → sends OTP and goes to step "otp"
  const handleSendOtp = async () => {
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
    const { data, error } = await supabase.functions.invoke("send-verification-code", {
      body: { email: email.trim(), action: "send" },
    });
    setLoading(false);
    if (error || !data?.success) {
      toast.error("Erro ao enviar código de verificação. Tenta novamente.");
      return;
    }
    toast.success("Código enviado para o teu email!");
    setStep(-1); // -1 = OTP verification step
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Introduz o código de 6 dígitos.");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("send-verification-code", {
      body: { email: email.trim(), action: "verify", code: otpCode },
    });
    if (error || !data?.verified) {
      setVerifying(false);
      toast.error(data?.error || "Código inválido ou expirado.");
      return;
    }
    // Code verified — now create the account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setVerifying(false);
    if (signUpError) {
      toast.error(signUpError.message);
      return;
    }
    if (signUpData.user) {
      setCreatedUserId(signUpData.user.id);
      // Wait for the session to be fully established before proceeding
      if (signUpData.session) {
        await supabase.auth.setSession({
          access_token: signUpData.session.access_token,
          refresh_token: signUpData.session.refresh_token,
        });
      } else {
        // If no session returned, wait briefly for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setStep(1);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("send-verification-code", {
      body: { email: email.trim(), action: "send" },
    });
    setLoading(false);
    if (error || !data?.success) {
      toast.error("Erro ao reenviar o código.");
      return;
    }
    toast.success("Novo código enviado!");
    setOtpCode("");
  };

  const saveOnboarding = async () => {
    if (selectedSubjects.length !== 1) {
      toast.error("Seleciona uma disciplina para continuar.");
      return;
    }

    setLoading(true);

    // Ensure we have an active session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? createdUserId;

    if (!userId) {
      setLoading(false);
      toast.error("Não foi possível associar a conta à disciplina. Inicia sessão e tenta novamente.");
      return;
    }

    // If no active session but we have the userId, try to refresh
    if (!session) {
      setLoading(false);
      toast.error("Sessão não encontrada. Por favor, faz login e completa o teu perfil nas definições.");
      navigate("/login", { replace: true });
      return;
    }

    // Retry upsert up to 2 times for transient RLS/timing issues
    let lastError: any = null;
    let savedData: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          nome: name.trim(),
          email: email.trim(),
          ano_escolar: selectedYear,
          disciplinas_favoritas: selectedSubjects.slice(0, 1),
          objetivo_estudo: selectedGoal,
          frequencia_estudo: selectedFreq,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("disciplinas_favoritas")
        .single();

      if (!error && data?.disciplinas_favoritas?.length) {
        savedData = data;
        lastError = null;
        break;
      }
      lastError = error;
      // Wait before retry
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
    }

    if (lastError || !savedData?.disciplinas_favoritas?.length) {
      setLoading(false);
      toast.error("Não foi possível guardar a disciplina selecionada. Tenta novamente.");
      return;
    }

    await refreshProfile();
    setLoading(false);
    navigate("/dashboard", { replace: true });
  };

  // OTP verification screen
  if (step === -1) {
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
            <h1 className="text-2xl font-bold mb-2">Verifica o teu email</h1>
            <p className="text-muted-foreground text-sm">
              Enviámos um código de 6 dígitos para <strong>{email}</strong>
            </p>
          </div>
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Label>Código de verificação</Label>
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button variant="hero" className="w-full" onClick={handleVerifyOtp} disabled={verifying || otpCode.length !== 6}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verificar e criar conta <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => { setStep(0); setOtpCode(""); }}
              >
                <ChevronLeft className="w-4 h-4 inline" /> Voltar
              </button>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={handleResendCode}
                disabled={loading}
              >
                {loading ? "A enviar..." : "Reenviar código"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <Button variant="hero" className="w-full" onClick={handleSendOtp} disabled={loading}>
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
      title: "Em qual disciplina precisas de mais ajuda?",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">No plano gratuito, podes escolher apenas uma disciplina.</p>
          <div className="grid grid-cols-1 gap-3">
            {subjects.map(s => (
              <button key={s} onClick={() => setSelectedSubjects([s])} className={`p-4 rounded-xl border text-sm font-medium transition-all text-left flex items-center justify-between ${selectedSubjects.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>
                {s} {selectedSubjects.includes(s) && <CheckCircle2 className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>
      ),
      valid: selectedSubjects.length === 1,
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
