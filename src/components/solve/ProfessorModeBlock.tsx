import { motion } from "framer-motion";
import { GraduationCap, BookOpen, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type Step = {
  numero: number;
  titulo: string;
  o_que_fazemos: string;
  fundamentacao: string;
  calculo: string;
  nota_teorica?: string;
};

type ProfessorData = {
  contexto_teorico?: string;
  definicoes?: string[];
  passos?: Step[];
  resposta_final?: string;
  unidade?: string;
  verificacao?: string;
  para_aprofundar?: string;
};

export default function ProfessorModeBlock({ data }: { data: ProfessorData }) {
  const [expandedSteps, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (n: number) => setExpanded(p => ({ ...p, [n]: !p[n] }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-indigo-500/5 to-primary/5">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-sm">Modo Professor — Explicação Académica</h3>
          </div>
        </div>

        {data.contexto_teorico && (
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">CONTEXTO TEÓRICO</div>
            <p className="text-sm leading-relaxed">{data.contexto_teorico}</p>
          </div>
        )}

        {data.definicoes && data.definicoes.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">DEFINIÇÕES</div>
            <div className="space-y-1.5">
              {data.definicoes.map((d, i) => (
                <div key={i} className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-sm">
                  <BookOpen className="w-3.5 h-3.5 inline mr-1.5 text-indigo-500" />
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      {data.passos && data.passos.map((step, i) => {
        const open = expandedSteps[step.numero] !== false;
        return (
          <motion.div
            key={step.numero}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
          >
            <button onClick={() => toggle(step.numero)} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                {step.numero}
              </div>
              <span className="font-medium text-sm flex-1">{step.titulo}</span>
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {open && (
              <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                <p className="text-sm">{step.o_que_fazemos}</p>
                <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">FUNDAMENTAÇÃO</div>
                  <p className="text-sm">{step.fundamentacao}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <pre className="text-sm font-mono whitespace-pre-wrap">{step.calculo}</pre>
                </div>
                {step.nota_teorica && (
                  <p className="text-xs text-muted-foreground p-2 bg-secondary/30 rounded-lg">📝 {step.nota_teorica}</p>
                )}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Final result */}
      {data.resposta_final && (
        <div className="bg-card rounded-xl border border-border/50 shadow-card p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-primary/5 border border-indigo-500/20">
            <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="text-xs font-medium text-muted-foreground">RESULTADO</div>
              <div className="text-lg font-bold">{data.resposta_final} {data.unidade && <span className="text-sm font-normal">({data.unidade})</span>}</div>
            </div>
          </div>
          {data.verificacao && <p className="text-sm mt-2 text-muted-foreground">{data.verificacao}</p>}
          {data.para_aprofundar && (
            <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              📚 <strong>Para aprofundar:</strong> {data.para_aprofundar}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
