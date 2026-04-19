import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Mail, Clock, CheckCircle2, XCircle } from "lucide-react";
import SubjectChangeRequestDialog from "./SubjectChangeRequestDialog";

const SUPPORT_EMAIL = "suporte@logicpathways.online";

export default function SubjectChangeCard() {
  const { user, profile, isAdmin, isPremium } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isFree = !isAdmin && !isPremium;
  const currentSubject = profile?.disciplinas_favoritas?.[0] || "—";

  const { data: latestRequest, refetch } = useQuery({
    queryKey: ["my-latest-subject-change", user?.id],
    enabled: !!user && isFree,
    queryFn: async () => {
      const { data } = await supabase
        .from("subject_change_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (!isFree) return null;

  const hasPending = latestRequest?.status === "Pendente";
  const lastDecided = latestRequest?.decided_at ? new Date(latestRequest.decided_at) : null;
  const daysSinceDecision = lastDecided
    ? Math.floor((Date.now() - lastDecided.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const cooldownRemaining = daysSinceDecision !== null && daysSinceDecision < 30 ? 30 - daysSinceDecision : 0;

  const canRequest = !hasPending && cooldownRemaining === 0;

  return (
    <>
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">A tua disciplina</h2>
              <p className="text-sm text-muted-foreground">Plano gratuito · 1 disciplina ativa</p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">{currentSubject}</Badge>
        </div>

        {hasPending && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning-light/50 border border-warning/20 mb-4">
            <Clock className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-warning">Pedido em análise</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Pedido para mudar para <strong>{latestRequest.requested_subject}</strong> submetido a{" "}
                {new Date(latestRequest.created_at).toLocaleDateString("pt-PT")}.
              </div>
            </div>
          </div>
        )}

        {!hasPending && latestRequest?.status === "Aprovado" && lastDecided && cooldownRemaining > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success-light/50 border border-success/20 mb-4">
            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-success">Último pedido aprovado</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Próximo pedido disponível em {cooldownRemaining} dia{cooldownRemaining !== 1 ? "s" : ""}.
              </div>
            </div>
          </div>
        )}

        {!hasPending && latestRequest?.status === "Rejeitado" && lastDecided && cooldownRemaining > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
            <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-destructive">Último pedido rejeitado</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Podes submeter novo pedido em {cooldownRemaining} dia{cooldownRemaining !== 1 ? "s" : ""}.
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Queres estudar outra disciplina? Submete um pedido de mudança. A nossa equipa
          analisa cada pedido individualmente. Em alternativa, podes contactar-nos diretamente
          em{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline inline-flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {SUPPORT_EMAIL}
          </a>
          .
        </div>

        <Button
          variant="hero"
          onClick={() => setDialogOpen(true)}
          disabled={!canRequest}
          className="w-full sm:w-auto"
        >
          {hasPending ? "Pedido em análise…" : cooldownRemaining > 0 ? `Disponível em ${cooldownRemaining}d` : "Pedir mudança de disciplina"}
        </Button>
      </div>

      <SubjectChangeRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentSubject={currentSubject}
        onSubmitted={refetch}
      />
    </>
  );
}
