import { motion } from "framer-motion";
import { MessageCircle, Lightbulb, HelpCircle } from "lucide-react";

type HintData = {
  pergunta_orientadora?: string;
  observacao?: string;
  proxima_acao?: string;
  conceito_chave?: string;
};

export default function HintInteractionCard({ data }: { data: HintData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border/50 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-sm">Pistas para Avançar</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Tenta resolver sozinho com estas orientações 💪</p>
      </div>

      <div className="p-4 space-y-3">
        {data.pergunta_orientadora && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
              <HelpCircle className="w-3.5 h-3.5" /> PERGUNTA ORIENTADORA
            </div>
            <p className="text-sm font-medium italic">"{data.pergunta_orientadora}"</p>
          </div>
        )}

        {data.observacao && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">👀 OBSERVAÇÃO</div>
            <p className="text-sm">{data.observacao}</p>
          </div>
        )}

        {data.proxima_acao && (
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">➡️ PRÓXIMO PASSO</div>
            <p className="text-sm">{data.proxima_acao}</p>
          </div>
        )}

        {data.conceito_chave && (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              <MessageCircle className="w-3.5 h-3.5" /> CONCEITO-CHAVE
            </div>
            <p className="text-sm font-medium">{data.conceito_chave}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
