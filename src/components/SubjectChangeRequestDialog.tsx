import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

const ALL_SUBJECTS = ["Matemática", "Física", "Química"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSubject: string;
  onSubmitted?: () => void;
}

export default function SubjectChangeRequestDialog({ open, onOpenChange, currentSubject, onSubmitted }: Props) {
  const { user, profile } = useAuth();
  const [requested, setRequested] = useState("");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const available = ALL_SUBJECTS.filter((s) => s !== currentSubject);

  useEffect(() => {
    if (open) {
      setRequested("");
      setMotivo("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!requested) {
      toast.error("Escolhe a disciplina pretendida.");
      return;
    }
    const trimmedMotivo = motivo.trim();
    if (trimmedMotivo.length < 10) {
      toast.error("Indica um motivo (mínimo 10 caracteres).");
      return;
    }
    if (trimmedMotivo.length > 500) {
      toast.error("Motivo demasiado longo (máx. 500 caracteres).");
      return;
    }

    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from("subject_change_requests")
        .insert({
          user_id: user.id,
          user_email: profile.email || user.email || "",
          user_name: profile.nome || null,
          current_subject: currentSubject,
          requested_subject: requested,
          motivo: trimmedMotivo,
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message || "Erro ao submeter pedido.");
        return;
      }

      // Fire-and-forget confirmation email
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "subject-change-submitted",
          recipientEmail: profile.email || user.email,
          idempotencyKey: `subject-change-submitted-${inserted.id}`,
          templateData: {
            nome: profile.nome,
            current_subject: currentSubject,
            requested_subject: requested,
          },
        },
      }).catch((e) => console.error("Email error:", e));

      toast.success("Pedido submetido! Receberás um email com a decisão.");
      onSubmitted?.();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pedir mudança de disciplina</DialogTitle>
          <DialogDescription>
            Os pedidos são analisados manualmente pela equipa. Recebes a decisão por email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
            <span className="font-medium">{currentSubject}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Nova disciplina</span>
          </div>

          <div>
            <Label>Disciplina pretendida</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {available.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRequested(s)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    requested === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="motivo">Motivo do pedido</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica brevemente porque queres mudar de disciplina..."
              className="mt-1.5 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{motivo.length}/500</p>
          </div>

          <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
            ℹ️ Só é possível submeter um pedido a cada 30 dias.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submeter pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
