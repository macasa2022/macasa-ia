import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, BookOpen, Bell, Palette, Shield, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("perfil");
  const { profile, user, refreshProfile, isPremium, subscriptionEnd } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [anoEscolar, setAnoEscolar] = useState("");
  const [estiloExplicacao, setEstiloExplicacao] = useState("Simples e direto");
  const [disciplinas, setDisciplinas] = useState<string[]>([]);

  const allDisciplinas = ["Matemática", "Física", "Química"];
  const disciplinasSelecionadas = disciplinas.filter((d) => allDisciplinas.includes(d));
  const disciplinasVisiveis = isPremium ? allDisciplinas : disciplinasSelecionadas;

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || "");
      setEmail(profile.email || "");
      setAnoEscolar(profile.ano_escolar || "7º ano");
      setEstiloExplicacao(profile.estilo_explicacao || "Simples e direto");
      setDisciplinas((profile.disciplinas_favoritas || []).filter((d) => allDisciplinas.includes(d)));
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmedNome = nome.trim();
    if (!trimmedNome || trimmedNome.length < 3 || !/[a-zA-ZÀ-ÿ]/.test(trimmedNome)) {
      toast.error("Introduz um nome válido (mínimo 3 letras).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Introduz um email válido.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: trimmedNome, email: email.trim(), ano_escolar: anoEscolar, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar perfil.");
    } else {
      toast.success("Perfil guardado com sucesso!");
      await refreshProfile();
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ estilo_explicacao: estiloExplicacao, disciplinas_favoritas: disciplinas, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar preferências.");
    } else {
      toast.success("Preferências guardadas com sucesso!");
      await refreshProfile();
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir gestão de subscrição.");
    } finally {
      setLoadingPortal(false);
    }
  };

  const toggleDisciplina = (d: string) => {
    setDisciplinas([d]);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
  };

  const tabs = [
    { id: "perfil", label: "Perfil", icon: User },
    { id: "estudo", label: "Preferências", icon: BookOpen },
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "aparencia", label: "Aparência", icon: Palette },
    { id: "conta", label: "Conta", icon: Shield },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Definições</h1>
          <p className="text-muted-foreground mb-6">Personaliza a tua experiência.</p>
        </motion.div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          {activeTab === "perfil" && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Ano escolar</Label>
                <select value={anoEscolar} onChange={e => setAnoEscolar(e.target.value)} className="w-full mt-1.5 border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  {["7º ano", "8º ano", "9º ano", "10º ano", "11º ano", "12º ano"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <Button variant="hero" onClick={handleSaveProfile} disabled={saving}>
                {saving ? "A guardar..." : "Guardar alterações"}
              </Button>
            </div>
          )}
          {activeTab === "estudo" && (
            <div className="space-y-4">
              <div>
                <Label>Estilo de explicação preferido</Label>
                <select value={estiloExplicacao} onChange={e => setEstiloExplicacao(e.target.value)} className="w-full mt-1.5 border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option>Simples e direto</option>
                  <option>Detalhado com exemplos</option>
                  <option>Formal e académico</option>
                </select>
              </div>
              <div>
                <Label>{isPremium ? "Disciplinas" : "Disciplina atual"}</Label>
                {isPremium ? (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {allDisciplinas.map(s => (
                      <button key={s} onClick={() => toggleDisciplina(s)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${disciplinas.includes(s) ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>{s}</button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1.5">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-primary/30 bg-primary/10 text-primary">
                      {disciplinasSelecionadas[0] || "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Para mudar de disciplina, submete um pedido formal a partir do <a href="/dashboard" className="text-primary hover:underline">Dashboard</a>.
                    </p>
                  </div>
                )}
              </div>
              <Button variant="hero" onClick={handleSavePreferences} disabled={saving}>
                {saving ? "A guardar..." : "Guardar preferências"}
              </Button>
            </div>
          )}
          {activeTab === "notificacoes" && (
            <div className="space-y-4">
              {["Lembretes de estudo", "Novos conteúdos", "Relatórios semanais", "Dicas do tutor"].map(n => (
                <label key={n} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm">{n}</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              ))}
            </div>
          )}
          {activeTab === "aparencia" && (
            <div className="space-y-4">
              <div>
                <Label>Tema</Label>
                <div className="flex gap-3 mt-2">
                  {([["light", "Claro"], ["dark", "Escuro"], ["system", "Sistema"]] as const).map(([value, label]) => (
                    <button key={value} onClick={() => setTheme(value)} className={`px-4 py-2 rounded-lg border text-sm font-medium ${theme === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === "conta" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="text-sm font-medium mb-1">Plano atual</div>
                <div className="text-lg font-bold text-primary">{isPremium ? "Premium" : "Gratuito"}</div>
                {isPremium && subscriptionEnd && (
                  <div className="text-xs text-muted-foreground">Renova a {formatDate(subscriptionEnd)}</div>
                )}
              </div>
              {isPremium ? (
                <Button variant="outline" onClick={handleManageSubscription} disabled={loadingPortal}>
                  {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Gerir subscrição
                </Button>
              ) : (
                <Button variant="hero" onClick={() => window.location.href = "/pricing"}>Fazer upgrade</Button>
              )}
              <Button variant="destructive" className="ml-3">Eliminar conta</Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
