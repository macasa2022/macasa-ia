import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowRight, Loader2, BookOpen, Clock, CheckCircle2, XCircle } from "lucide-react";

type Req = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  current_subject: string;
  requested_subject: string;
  motivo: string | null;
  status: "Pendente" | "Aprovado" | "Rejeitado";
  admin_notes: string | null;
  decided_at: string | null;
  created_at: string;
};

export default function SubjectChangeRequestsSection() {
  const [statusFilter, setStatusFilter] = useState<string>("Pendente");
  const [selected, setSelected] = useState<Req | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [decision, setDecision] = useState<"Aprovado" | "Rejeitado" | null>(null);
  const [processing, setProcessing] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-subject-change-requests", statusFilter],
    queryFn: async () => {
      let q = supabase.from("subject_change_requests").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Req[];
    },
  });

  const openDecision = (req: Req, dec: "Aprovado" | "Rejeitado") => {
    setSelected(req);
    setDecision(dec);
    setAdminNotes(req.admin_notes || "");
  };

  const closeDialog = () => {
    setSelected(null);
    setDecision(null);
    setAdminNotes("");
  };

  const submitDecision = async () => {
    if (!selected || !decision) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("decide-subject-change", {
        body: { request_id: selected.id, decision, admin_notes: adminNotes },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Erro");
      toast.success(decision === "Aprovado" ? "Pedido aprovado e perfil atualizado!" : "Pedido rejeitado. Aluno notificado.");
      closeDialog();
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar decisão.");
    } finally {
      setProcessing(false);
    }
  };

  const counts = {
    pendentes: requests.filter((r) => r.status === "Pendente").length,
    aprovados: requests.filter((r) => r.status === "Aprovado").length,
    rejeitados: requests.filter((r) => r.status === "Rejeitado").length,
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard icon={Clock} label="Pendentes" value={counts.pendentes} color="text-warning" />
        <StatCard icon={CheckCircle2} label="Aprovados" value={counts.aprovados} color="text-success" />
        <StatCard icon={XCircle} label="Rejeitados" value={counts.rejeitados} color="text-destructive" />
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Pendente">Pendentes</SelectItem>
            <SelectItem value="Aprovado">Aprovados</SelectItem>
            <SelectItem value="Rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Aluno</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Mudança</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Motivo</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Submetido</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">A carregar...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum pedido encontrado.
                </td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors align-top">
                    <td className="p-4">
                      <div className="font-medium text-sm">{r.user_name || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground">{r.user_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span>{r.current_subject}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium text-primary">{r.requested_subject}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-[260px]">
                      <p className="text-xs text-muted-foreground line-clamp-3">{r.motivo || "—"}</p>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={r.status === "Aprovado" ? "default" : r.status === "Rejeitado" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {r.status}
                      </Badge>
                      {r.decided_at && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(r.decided_at).toLocaleDateString("pt-PT")}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="p-4">
                      {r.status === "Pendente" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" className="text-xs h-8" onClick={() => openDecision(r, "Aprovado")}>
                            ✓ Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => openDecision(r, "Rejeitado")}>
                            ✗ Rejeitar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.admin_notes ? "Com nota" : "Sem nota"}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected && !!decision} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{decision === "Aprovado" ? "Aprovar pedido" : "Rejeitar pedido"}</DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  Aluno: <strong>{selected.user_name || selected.user_email}</strong><br />
                  De <strong>{selected.current_subject}</strong> para <strong>{selected.requested_subject}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selected?.motivo && (
              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
                <strong>Motivo do aluno:</strong><br />{selected.motivo}
              </div>
            )}
            <div>
              <Label>Nota para o aluno {decision === "Rejeitado" ? "(recomendado)" : "(opcional)"}</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={decision === "Rejeitado" ? "Explica o motivo da rejeição..." : "Ex: bem-vindo à nova disciplina!"}
                className="mt-1.5 min-h-[80px]"
                maxLength={1000}
              />
            </div>
            {decision === "Aprovado" && (
              <div className="text-xs text-success p-2 rounded bg-success-light/30">
                ℹ️ A disciplina do aluno será automaticamente alterada para <strong>{selected?.requested_subject}</strong>.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processing}>Cancelar</Button>
            <Button
              variant={decision === "Aprovado" ? "hero" : "destructive"}
              onClick={submitDecision}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar {decision === "Aprovado" ? "aprovação" : "rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border/50 shadow-card">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}
