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

export default function ProfessorModeBlock({ data }: { data: ProfessorData }) {
  const [expandedSteps, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (n: number) => setExpanded(p => ({ ...p, [n]: !p[n] }));
  const definicoes = Array.isArray(data.definicoes) ? data.definicoes.map(toText).filter(Boolean) : [];
  const passos = Array.isArray(data.passos) ? data.passos.filter((step) => !!step && typeof step === "object") : [];
  const contextoTeorico = toText(data.contexto_teorico);
  const respostaFinal = toText(data.resposta_final);
  const unidade = toText(data.unidade);
  const verificacao = toText(data.verificacao);
  const paraAprofundar = toText(data.para_aprofundar);

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

        {contextoTeorico && (
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">CONTEXTO TEÓRICO</div>
            <p className="text-sm leading-relaxed">{contextoTeorico}</p>
          </div>
        )}

        {definicoes.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">DEFINIÇÕES</div>
            <div className="space-y-1.5">
              {definicoes.map((d, i) => (
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
      {passos.map((step, i) => {
        const numero = typeof step.numero === "number" ? step.numero : i + 1;
        const titulo = toText(step.titulo) || `Passo ${numero}`;
        const oQueFazemos = toText(step.o_que_fazemos);
        const fundamentacao = toText(step.fundamentacao);
        const calculo = toText(step.calculo);
        const notaTeorica = toText(step.nota_teorica);
        const open = expandedSteps[numero] !== false;
        return (
          <motion.div
            key={numero}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
          >
            <button onClick={() => toggle(numero)} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                {numero}
              </div>
              <span className="font-medium text-sm flex-1">{titulo}</span>
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {open && (
              <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                {oQueFazemos && <p className="text-sm">{oQueFazemos}</p>}
                {fundamentacao && (
                  <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">FUNDAMENTAÇÃO</div>
                    <p className="text-sm">{fundamentacao}</p>
                  </div>
                )}
                {calculo && (
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{calculo}</pre>
                  </div>
                )}
                {notaTeorica && (
                  <p className="text-xs text-muted-foreground p-2 bg-secondary/30 rounded-lg">📝 {notaTeorica}</p>
                )}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Final result */}
      {respostaFinal && (
        <div className="bg-card rounded-xl border border-border/50 shadow-card p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-primary/5 border border-indigo-500/20">
            <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="text-xs font-medium text-muted-foreground">RESULTADO</div>
              <div className="text-lg font-bold">{respostaFinal} {unidade && <span className="text-sm font-normal">({unidade})</span>}</div>
            </div>
          </div>
          {verificacao && <p className="text-sm mt-2 text-muted-foreground">{verificacao}</p>}
          {paraAprofundar && (
            <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              📚 <strong>Para aprofundar:</strong> {paraAprofundar}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
