import { motion } from "framer-motion";
import { Dumbbell, ArrowUp, ArrowDown, Equal, HelpCircle, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type PracticeData = {
  exercicios_semelhantes?: { enunciado: string; dificuldade: string }[];
  exercicio_facil?: { enunciado: string };
  exercicio_dificil?: { enunciado: string };
  quiz?: { pergunta: string; opcoes: string[]; correta: string; explicacao: string };
  resumo_conceito?: string;
  erros_comuns?: string[];
};

export default function PracticeNextCard({
  data,
  onTryExercise,
}: {
  data: PracticeData;
  onTryExercise?: (exercise: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Consolida o Que Aprendeste</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        {data.resumo_conceito && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
              <BookOpen className="w-3.5 h-3.5" /> RESUMO DO CONCEITO
            </div>
            <p className="text-sm leading-relaxed">{data.resumo_conceito}</p>
          </div>
        )}

        {/* Common errors */}
        {data.erros_comuns && data.erros_comuns.length > 0 && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> ERROS COMUNS A EVITAR
            </div>
            <ul className="space-y-1">
              {data.erros_comuns.map((e, i) => (
                <li key={i} className="text-sm text-red-800 dark:text-red-300 pl-3 border-l-2 border-red-500/30">{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Similar exercises */}
        {data.exercicios_semelhantes && data.exercicios_semelhantes.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">EXERCÍCIOS SEMELHANTES</div>
            {data.exercicios_semelhantes.map((ex, i) => (
              <button
                key={i}
                onClick={() => onTryExercise?.(ex.enunciado)}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm flex items-center gap-2"
              >
                <Equal className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{ex.enunciado}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {data.exercicio_facil && (
            <button
              onClick={() => onTryExercise?.(data.exercicio_facil!.enunciado)}
              className="p-3 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-all text-left"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                <ArrowDown className="w-3 h-3" /> Mais fácil
              </div>
              <p className="text-xs leading-relaxed line-clamp-2">{data.exercicio_facil.enunciado}</p>
            </button>
          )}
          {data.exercicio_dificil && (
            <button
              onClick={() => onTryExercise?.(data.exercicio_dificil!.enunciado)}
              className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-all text-left"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                <ArrowUp className="w-3 h-3" /> Mais difícil
              </div>
              <p className="text-xs leading-relaxed line-clamp-2">{data.exercicio_dificil.enunciado}</p>
            </button>
          )}
        </div>

        {/* Quiz */}
        {data.quiz && (
          <QuizCard quiz={data.quiz} />
        )}
      </div>
    </motion.div>
  );
}

function QuizCard({ quiz }: { quiz: { pergunta: string; opcoes: string[]; correta: string; explicacao: string } }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
        <HelpCircle className="w-3.5 h-3.5" /> QUIZ RÁPIDO
      </div>
      <p className="text-sm font-medium mb-2">{quiz.pergunta}</p>
      <div className="space-y-1.5">
        {quiz.opcoes.map((opt, i) => {
          const isCorrect = opt === quiz.correta;
          const isSelected = opt === selected;
          let cls = "border-border hover:border-primary/30";
          if (revealed && isCorrect) cls = "border-green-500 bg-green-500/10";
          else if (revealed && isSelected && !isCorrect) cls = "border-red-500 bg-red-500/10";
          else if (isSelected) cls = "border-primary bg-primary/10";

          return (
            <button
              key={i}
              onClick={() => { if (!revealed) setSelected(opt); }}
              className={`w-full text-left p-2 rounded-lg border text-sm transition-all ${cls}`}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
      </div>
      {selected && !revealed && (
        <Button size="sm" className="mt-2" onClick={() => setRevealed(true)}>
          Verificar
        </Button>
      )}
      {revealed && (
        <p className="text-xs mt-2 p-2 rounded bg-secondary/50">{quiz.explicacao}</p>
      )}
    </div>
  );
}

import { useState } from "react";
