import { motion } from "framer-motion";
import { BookOpen, Atom, FlaskConical, Brain, Target, AlertTriangle, Lightbulb, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Analysis = {
  disciplina?: string;
  tema?: string;
  subtema?: string;
  ano_estimado?: string;
  dificuldade?: string;
  tipo?: string;
  dados?: string[];
  incognitas?: string[];
  formulas?: string[];
  armadilhas?: string[];
  prerequisitos?: string[];
};

const subjectIcon: Record<string, React.ReactNode> = {
  "Matemática": <BookOpen className="w-4 h-4" />,
  "Física": <Atom className="w-4 h-4" />,
  "Química": <FlaskConical className="w-4 h-4" />,
};

const diffColor: Record<string, string> = {
  "Fácil": "bg-green-500/10 text-green-700 dark:text-green-400",
  "Médio": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "Difícil": "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function AnalysisSummaryCard({ data }: { data: Analysis }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden"
    >
      <div className="p-4 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Análise do Exercício</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.disciplina && (
            <Badge variant="secondary" className="gap-1.5">
              {subjectIcon[data.disciplina]} {data.disciplina}
            </Badge>
          )}
          {data.tema && <Badge variant="outline">{data.tema}</Badge>}
          {data.subtema && <Badge variant="outline" className="text-xs">{data.subtema}</Badge>}
          {data.ano_estimado && <Badge variant="outline">📚 {data.ano_estimado}</Badge>}
          {data.dificuldade && (
            <Badge className={diffColor[data.dificuldade] || ""}>{data.dificuldade}</Badge>
          )}
          {data.tipo && <Badge variant="outline" className="text-xs">{data.tipo}</Badge>}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.isArray(data.dados) && data.dados.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <List className="w-3.5 h-3.5" /> DADOS FORNECIDOS
            </div>
            <ul className="space-y-1">
              {data.dados.map((d, i) => (
                <li key={i} className="text-sm pl-3 border-l-2 border-primary/30">{d}</li>
              ))}
            </ul>
          </div>
        )}

        {data.incognitas && data.incognitas.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Target className="w-3.5 h-3.5" /> O QUE DESCOBRIR
            </div>
            <ul className="space-y-1">
              {data.incognitas.map((d, i) => (
                <li key={i} className="text-sm pl-3 border-l-2 border-accent/50 font-medium">{d}</li>
              ))}
            </ul>
          </div>
        )}

        {data.formulas && data.formulas.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5" /> FÓRMULAS RELEVANTES
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.formulas.map((f, i) => (
                <code key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-mono">{f}</code>
              ))}
            </div>
          </div>
        )}

        {data.armadilhas && data.armadilhas.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" /> ATENÇÃO
            </div>
            <ul className="space-y-1">
              {data.armadilhas.map((a, i) => (
                <li key={i} className="text-sm pl-3 border-l-2 border-destructive/30 text-muted-foreground">{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
