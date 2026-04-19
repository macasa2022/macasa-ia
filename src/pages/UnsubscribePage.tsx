import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Status = "validating" | "ready" | "already" | "invalid" | "submitting" | "success" | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setErrorMsg("Link de cancelamento inválido — falta o token.");
      return;
    }
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: supabaseAnonKey } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          setErrorMsg(data?.error ?? "Token inválido ou expirado.");
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
          return;
        }
        if (data.valid === true) {
          setStatus("ready");
          return;
        }
        setStatus("invalid");
      } catch (e) {
        setStatus("error");
        setErrorMsg("Não foi possível validar o link. Tenta novamente.");
      }
    })();
  }, [token]);

  const handleConfirm = async () => {
    setStatus("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else { setStatus("error"); setErrorMsg(data?.error ?? "Erro desconhecido."); }
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? "Erro ao processar o cancelamento.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-card p-8 text-center">
        {status === "validating" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
            <h1 className="text-xl font-semibold mb-2">A validar o teu pedido…</h1>
            <p className="text-sm text-muted-foreground">Aguarda um momento.</p>
          </>
        )}

        {status === "ready" && (
          <>
            <MailX className="w-10 h-10 mx-auto text-primary mb-4" />
            <h1 className="text-xl font-semibold mb-2">Cancelar subscrição de emails</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Confirmas que queres deixar de receber emails da Logic Pathways?
            </p>
            <Button onClick={handleConfirm} variant="hero" className="w-full">
              Confirmar cancelamento
            </Button>
          </>
        )}

        {status === "submitting" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
            <h1 className="text-xl font-semibold mb-2">A processar…</h1>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-4" />
            <h1 className="text-xl font-semibold mb-2">Subscrição cancelada</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Não vais receber mais emails. Podes voltar a inscrever-te a qualquer momento.
            </p>
            <Link to="/"><Button variant="outline" className="w-full">Voltar ao site</Button></Link>
          </>
        )}

        {status === "already" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Já estavas removido</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Este email já tinha sido cancelado anteriormente.
            </p>
            <Link to="/"><Button variant="outline" className="w-full">Voltar ao site</Button></Link>
          </>
        )}

        {(status === "invalid" || status === "error") && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-semibold mb-2">Algo correu mal</h1>
            <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
            <Link to="/"><Button variant="outline" className="w-full">Voltar ao site</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
