import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, HelpCircle } from "lucide-react";

type Validation = {
  resposta_final?: string;
  unidade?: string;
  verificacao?: string;
  interpretacao?: string;
  faz_sentido?: string;
};

const toText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
};

export default function ValidationSummaryCard({ data }: { data: Validation }) {
  const respostaFinal = toText(data.resposta_final);
  const unidade = toText(data.unidade);
  const verificacao = toText(data.verificacao);
  const interpretacao = toText(data.interpretacao);
  const fazSentido = toText(data.faz_sentido);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border/50 bg-green-500/5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="font-semibold text-sm">Verificação da Resposta</h3>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Final answer */}
        {respostaFinal && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <CheckCircle className="w-6 h-6 text-primary shrink-0" />
            <div>
              <div className="text-xs font-medium text-muted-foreground">RESPOSTA FINAL</div>
              <div className="text-lg font-bold text-primary">
                {respostaFinal}
                {unidade && <span className="text-sm font-normal ml-1">({unidade})</span>}
              </div>
            </div>
          </div>
        )}

        {verificacao && (
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="text-xs font-medium text-muted-foreground mb-1">✅ VERIFICAÇÃO</div>
            <p className="text-sm">{verificacao}</p>
          </div>
        )}

        {interpretacao && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">💬 EM LINGUAGEM SIMPLES</div>
            <p className="text-sm text-blue-800 dark:text-blue-300">{interpretacao}</p>
          </div>
        )}

        {fazSentido && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <HelpCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-0.5">FAZ SENTIDO?</div>
              <p className="text-sm text-green-800 dark:text-green-300">{fazSentido}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
