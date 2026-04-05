import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  const { user } = useAuth();

  const handleUpgradeClick = (planName: string) => {
    if (planName === "Escola") {
      toast.info("Contacta-nos para saber mais sobre o plano Escola.");
      return;
    }
    toast.info("O sistema de pagamentos será disponibilizado em breve. Fica atento!");
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
                <Button variant={p.popular ? "hero" : "outline"} className="w-full" onClick={() => handleUpgradeClick(p.name)}>
                  {p.popular ? "Começar Premium" : p.name === "Escola" ? "Contactar" : "Plano atual"}
                </Button>
              ) : (
                <Button variant={p.popular ? "hero" : "outline"} className="w-full" asChild>
                  <Link to="/signup">{p.popular ? "Começar Premium" : "Escolher plano"}</Link>
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
