import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { useState } from "react";

import { MathText } from "@/components/MathText";
type Step = {
  numero: number;
  titulo: string;
  o_que_fazemos: string;
  porque?: string;
  fundamentacao?: string;
  calculo: string;
  dica?: string;
  nota_teorica?: string;
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

export default function StepByStepSolution({ steps }: { steps: Step[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = (n: number) => setExpanded(prev => ({ ...prev, [n]: !prev[n] }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
        </div>
        <h3 className="font-semibold text-sm">Resolução Passo a Passo</h3>
      </div>

      {(steps || []).map((step, i) => {
        if (!step || typeof step !== 'object') return null;
        const numero = typeof step.numero === "number" ? step.numero : i + 1;
        const titulo = toText(step.titulo) || `Passo ${numero}`;
        const oQueFazemos = toText(step.o_que_fazemos);
        const porque = toText(step.porque);
        const fundamentacao = toText(step.fundamentacao);
        const calculo = toText(step.calculo);
        const dica = toText(step.dica);
        const notaTeorica = toText(step.nota_teorica);
        const isOpen = expanded[numero] !== false; // default open
        return (
          <motion.div
            key={numero}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
            className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
          >
            <button
              onClick={() => toggle(numero)}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {numero}
              </div>
              <span className="font-medium text-sm flex-1"><MathText text={titulo} /></span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                {/* What we're doing */}
                {oQueFazemos && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">O QUE FAZEMOS</div>
                    <p className="text-sm leading-relaxed"><MathText text={oQueFazemos} /></p>
                  </div>
                )}

                {/* Why */}
                {(porque || fundamentacao) && (
                  <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                      {fundamentacao ? "FUNDAMENTAÇÃO" : "PORQUÊ?"}
                    </div>
                    <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                      <MathText text={fundamentacao || porque} />
                    </p>
                  </div>
                )}

                {/* Calculation */}
                {calculo && (
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed"><MathText text={calculo} /></div>
                  </div>
                )}

                {/* Tip / Note */}
                {(dica || notaTeorica) && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                      <MathText text={dica || notaTeorica} />
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
