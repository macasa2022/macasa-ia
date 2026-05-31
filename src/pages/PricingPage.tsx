import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { Seo } from "@/components/Seo";

const plans = [
  {
    name: "Gratuito", price: "0€", period: "/mês", desc: "Para experimentar e começar",
    features: ["5 perguntas por dia", "Explicações básicas", "1 disciplina", "Histórico limitado"],
    popular: false,
  },
  {
    name: "Premium", price: "9,99€", period: "/mês", desc: "Para quem quer resultados a sério",
    features: ["Perguntas ilimitadas", "Explicações completas", "Todas as disciplinas", "Modo treino avançado", "Upload de imagem", "Plano de estudo personalizado", "Relatórios de progresso", "Suporte prioritário"],
    popular: true,
  },
  {
    name: "Escola", price: "Sob consulta", period: "", desc: "Para escolas e centros",
    features: ["Gestão de alunos", "Dashboard do professor", "Relatórios pedagógicos", "Acompanhamento de turmas", "Integração escolar", "Suporte dedicado"],
    popular: false,
  },
];

export default function PricingPage() {
  const { user, isPremium } = useAuth();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const handleUpgradeClick = async (planName: string) => {
    if (planName === "Escola") {
      setContactOpen(true);
      return;
    }
    if (planName === "Gratuito") return;

    if (!user) {
      toast.info("Cria uma conta primeiro para fazer upgrade.");
      return;
    }

    setLoadingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const getButtonLabel = (planName: string) => {
    if (planName === "Escola") return "Contactar";
    if (planName === "Gratuito") return isPremium ? "Gratuito" : "Plano atual";
    if (planName === "Premium") return isPremium ? "Plano atual" : "Começar Premium";
    return "Escolher";
  };

  const isCurrentPlan = (planName: string) => {
    if (planName === "Premium" && isPremium) return true;
    if (planName === "Gratuito" && !isPremium) return true;
    return false;
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Planos e Preços</h1>
          <p className="text-muted-foreground">Escolhe o plano certo para o teu estudo.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <motion.div key={i} className={`bg-card rounded-xl p-8 border ${p.popular ? "border-primary shadow-glow" : "border-border/50 shadow-card"} relative`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-hero text-primary-foreground text-xs font-bold rounded-full">Mais popular</div>}
              {isCurrentPlan(p.name) && <div className="absolute top-4 right-4 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">O teu plano</div>}
              <h3 className="font-bold text-xl mb-1">{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="text-muted-foreground text-sm">{p.period}</span>
              </div>
              <p className="text-muted-foreground text-sm mb-6">{p.desc}</p>
              <ul className="space-y-3 mb-8">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {f}</li>
                ))}
              </ul>
              {user ? (
                <Button
                  variant={p.popular && !isPremium ? "hero" : "outline"}
                  className="w-full"
                  onClick={() => handleUpgradeClick(p.name)}
                  disabled={isCurrentPlan(p.name) || loadingCheckout}
                >
                  {loadingCheckout && p.name === "Premium" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {getButtonLabel(p.name)}
                </Button>
              ) : (
                <Button variant={p.popular ? "hero" : "outline"} className="w-full" asChild>
                  <Link to="/signup">{p.popular ? "Começar Premium" : p.name === "Escola" ? "Contactar" : "Escolher plano"}</Link>
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <ContactFormDialog open={contactOpen} onOpenChange={setContactOpen} />
    </AppLayout>
  );
}
