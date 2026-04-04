import { motion } from "framer-motion";
import { Brain, Eye, AlertTriangle, Lightbulb, Sparkles } from "lucide-react";

type Strategy = {
  ideia_principal?: string;
  observar_primeiro?: string;
  estrategia?: string;
  erro_comum?: string;
  dica_motivacional?: string;
};

export default function StrategyThinkingCard({ data }: { data: Strategy }) {
  const items = [
    { icon: Brain, label: "Ideia Principal", text: data.ideia_principal, color: "text-primary border-primary/30 bg-primary/5" },
    { icon: Eye, label: "Observar Primeiro", text: data.observar_primeiro, color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5" },
    { icon: Lightbulb, label: "Estratégia", text: data.estrategia, color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5" },
    { icon: AlertTriangle, label: "Erro Comum a Evitar", text: data.erro_comum, color: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5" },
  ].filter(i => i.text);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-amber-500/5 to-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-sm">Como Pensar Neste Exercício</h3>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className={`flex gap-3 p-3 rounded-lg border ${item.color}`}
          >
            <item.icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide mb-0.5">{item.label}</div>
              <p className="text-sm leading-relaxed">{item.text}</p>
            </div>
          </motion.div>
        ))}

        {data.dica_motivacional && (
          <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm text-primary font-medium">💡 {data.dica_motivacional}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
