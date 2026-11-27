import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDeviceId, getDeviceLabel } from "@/lib/device";
import { relativeTime } from "@/lib/attempts";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Uma sessão ativa por conta, com transferência entre dispositivos.
// - Depois do login: "claim". Se a conta estiver ativa noutro navegador, pergunta se quer transferir.
// - A cada minuto (e ao voltar ao separador/janela): "heartbeat" — o servidor termina sessões inativas
//   (60 min sem atividade) ou longas (12 h) e avisa se a sessão passou para outro dispositivo.

// Verificação frequente para que a sessão antiga saia depressa depois de uma transferência
const HEARTBEAT_MS = 60_000;
// "Ativo" = houve interação nos últimos 5 min (a inatividade é contada no servidor)
const ACTIVE_WINDOW_MS = 5 * 60_000;

type Other = { device_label: string | null; last_seen: string } | null;

export async function sessionGuard(action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("session-guard", {
    body: { action, device_id: getDeviceId(), device_label: getDeviceLabel(), ...extra },
  });
  if (error) {
    // 401 = esta sessão já não existe no servidor (foi transferida/terminada noutro dispositivo)
    const status = (error as { context?: Response }).context?.status;
    if (status === 401) return { status: "revoked" };
    console.error("session-guard:", error);
    return null;
  }
  return data as { status: string; other?: Other; reason?: string } | null;
}

export default function SessionGuard() {
  const { user, signOut } = useAuth();
  const [conflict, setConflict] = useState<Other>(null);
  const [busy, setBusy] = useState(false);
  const lastActivity = useRef(Date.now());

  const handle = async (data: Awaited<ReturnType<typeof sessionGuard>>) => {
    if (!data) return;
    switch (data.status) {
      case "conflict":
        setConflict(data.other ?? { device_label: null, last_seen: new Date().toISOString() });
        break;
      case "suspended":
        setConflict(null);
        await signOut({ skipRelease: true });
        toast.error("A tua conta está suspensa. Contacta o suporte.", { duration: 15000 });
        break;
      case "revoked":
      case "replaced":
        setConflict(null);
        await signOut({ skipRelease: true });
        toast.info("A tua sessão foi transferida para outro dispositivo.", { duration: 15000 });
        break;
      case "expired":
        setConflict(null);
        await signOut({ skipRelease: true });
        toast.info("A sessão terminou por inatividade. Inicia sessão novamente.", { duration: 15000 });
        break;
    }
  };

  // Registar a sessão quando o utilizador entra
  useEffect(() => {
    if (!user) {
      setConflict(null);
      return;
    }
    sessionGuard("claim").then(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Atividade do aluno (vários separadores do mesmo navegador funcionam normalmente)
  useEffect(() => {
    const mark = () => { lastActivity.current = Date.now(); };
    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, mark));
  }, []);

  // Sinal periódico
  useEffect(() => {
    if (!user || conflict) return;
    const beat = () =>
      sessionGuard("heartbeat", { active: Date.now() - lastActivity.current < ACTIVE_WINDOW_MS }).then(handle);
    const id = setInterval(beat, HEARTBEAT_MS);
    // Verificar logo ao voltar ao separador ou à janela (ex.: alternar entre Chrome e Firefox)
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    const onFocus = () => beat();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, conflict]);

  const transfer = async () => {
    setBusy(true);
    const data = await sessionGuard("claim", { force: true });
    setBusy(false);
    if (data?.status === "ok") {
      setConflict(null);
      toast.success("Sessão transferida para este dispositivo.");
    } else if (data) {
      handle(data);
    } else {
      toast.error("Não foi possível transferir a sessão. Tenta novamente.");
    }
  };

  const cancel = async () => {
    setConflict(null);
    await signOut({ skipRelease: true });
  };

  return (
    <AlertDialog open={!!conflict}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="w-5 h-5 text-primary" aria-hidden="true" />
            Já tens uma sessão ativa noutro dispositivo
          </AlertDialogTitle>
          <AlertDialogDescription>
            A tua conta está aberta em <strong>{conflict?.device_label || "outro dispositivo"}</strong>
            {conflict?.last_seen ? <> (última atividade: {relativeTime(conflict.last_seen).toLowerCase()})</> : null}.
            Só pode haver uma sessão ativa de cada vez. Se continuares aqui, a outra sessão termina.
            <br /><br />
            Se não reconheces esse acesso, continua aqui e altera a tua palavra-passe nas Definições.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={cancel} disabled={busy}>Cancelar</Button>
          <Button variant="hero" onClick={transfer} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Continuar neste dispositivo
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
