import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";
import SessionGuard from "@/components/SessionGuard";

type Profile = {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  ano_escolar: string | null;
  estilo_explicacao: string | null;
  disciplinas_favoritas: string[] | null;
  objetivo_estudo: string | null;
  frequencia_estudo: string | null;
  avatar_url: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isPremium: boolean;
  isSchoolPremium: boolean;
  subscriptionEnd: string | null;
  /** Estado do pagamento Stripe: active | grace (renovação por pagar) | pending_first (compra por pagar) | none */
  paymentState: string | null;
  paymentDueDate: string | null;
  pendingInvoiceUrl: string | null;
  loading: boolean;
  signOut: (opts?: { skipRelease?: boolean }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isPremium: false,
  isSchoolPremium: false,
  subscriptionEnd: null,
  paymentState: null,
  paymentDueDate: null,
  pendingInvoiceUrl: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  checkSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStripePremium, setIsStripePremium] = useState(false);
  const [isSchoolPremium, setIsSchoolPremium] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<string | null>(null);
  const [paymentDueDate, setPaymentDueDate] = useState<string | null>(null);
  const [pendingInvoiceUrl, setPendingInvoiceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Premium = subscrição (Stripe ou atribuída pelo admin, via check-subscription),
  // plano Escola, ou administrador (acesso total a todos os planos).
  const isPremium = isStripePremium || isSchoolPremium || isAdmin;

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    setIsAdmin(!!data);
  };

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Error checking subscription:", error);
        return;
      }
      setIsStripePremium(!!data?.subscribed);
      setSubscriptionEnd(data?.subscription_end || null);
      setPaymentState(data?.state || null);
      setPaymentDueDate(data?.due_date || null);
      setPendingInvoiceUrl(data?.invoice_url || null);
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
  };

  const checkSchoolPremium = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("school_premium_members")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("Error checking school premium:", error);
        return;
      }
      setIsSchoolPremium(!!data);
    } catch (err) {
      console.error("Error checking school premium:", err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await checkAdmin(user.id);
      await checkSubscription();
      await checkSchoolPremium(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            await checkAdmin(session.user.id);
            await checkSubscription();
            await checkSchoolPremium(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsStripePremium(false);
          setIsSchoolPremium(false);
          setSubscriptionEnd(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdmin(session.user.id);
        checkSubscription();
        checkSchoolPremium(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async (opts?: { skipRelease?: boolean }) => {
    // Libertar a sessão ativa deste dispositivo (permite entrar logo noutro)
    if (!opts?.skipRelease) {
      try {
        await supabase.functions.invoke("session-guard", { body: { action: "release", device_id: getDeviceId() } });
      } catch { /* sem rede: a sessão expira sozinha por inatividade */ }
    }
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsStripePremium(false);
    setIsSchoolPremium(false);
    setSubscriptionEnd(null);
    setPaymentState(null);
    setPaymentDueDate(null);
    setPendingInvoiceUrl(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isPremium, isSchoolPremium, subscriptionEnd, paymentState, paymentDueDate, pendingInvoiceUrl, loading, signOut, refreshProfile, checkSubscription }}>
      {children}
      <SessionGuard />
    </AuthContext.Provider>
  );
}
