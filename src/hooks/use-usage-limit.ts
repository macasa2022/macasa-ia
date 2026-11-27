import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MAX_QUESTIONS = 5;
const COOLDOWN_HOURS = 20;
const WARNING_THRESHOLD = 3;

export function useUsageLimit() {
  const { user, isAdmin, isPremium } = useAuth();
  const [questionCount, setQuestionCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const isLimited = !isAdmin && !isPremium;

  const fetchUsage = useCallback(async () => {
    if (!user || !isLimited) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      // Check if cooldown has expired
      if (data.cooldown_until && new Date(data.cooldown_until) > new Date()) {
        setQuestionCount(data.question_count);
        setCooldownUntil(new Date(data.cooldown_until));
      } else if (data.cooldown_until && new Date(data.cooldown_until) <= new Date()) {
        // Período de espera terminou (o servidor reinicia a contagem na próxima pergunta)
        setQuestionCount(0);
        setCooldownUntil(null);
      } else {
        setQuestionCount(data.question_count);
        setCooldownUntil(null);
      }
    }
    setLoading(false);
  }, [user, isLimited]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Refresh cooldown status periodically
  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = setInterval(() => {
      if (new Date() >= cooldownUntil) {
        setQuestionCount(0);
        setCooldownUntil(null);
        fetchUsage();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [cooldownUntil, fetchUsage]);

  // Verificação prévia (só leitura). A contagem a sério é feita no servidor
  // (Edge Function mentor-ai), que é quem decide se a pergunta é permitida.
  const recordQuestion = useCallback(async () => {
    if (!user || !isLimited) return { allowed: true, warning: false };

    const { data: existing } = await supabase
      .from("usage_tracking")
      .select("question_count, cooldown_until")
      .eq("user_id", user.id)
      .maybeSingle();

    let count = existing?.question_count ?? 0;
    const cooldown = existing?.cooldown_until ? new Date(existing.cooldown_until) : null;
    if (cooldown && cooldown > new Date()) {
      setCooldownUntil(cooldown);
      return { allowed: false, warning: false };
    }
    if (cooldown && cooldown <= new Date()) count = 0;

    const currentCount = count + 1;
    if (currentCount >= MAX_QUESTIONS) {
      setCooldownUntil(new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000));
    }
    setQuestionCount(currentCount);
    const warning = currentCount === WARNING_THRESHOLD;
    return { allowed: true, warning, remaining: MAX_QUESTIONS - currentCount };
  }, [user, isLimited]);

  const isOnCooldown = !!cooldownUntil && cooldownUntil > new Date();
  const remaining = MAX_QUESTIONS - questionCount;
  const showWarning = isLimited && remaining <= 2 && remaining > 0 && !isOnCooldown;

  const getCooldownTimeLeft = useCallback(() => {
    if (!cooldownUntil) return "";
    const diff = cooldownUntil.getTime() - Date.now();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  }, [cooldownUntil]);

  return {
    questionCount,
    remaining,
    isOnCooldown,
    isLimited,
    showWarning,
    loading,
    recordQuestion,
    getCooldownTimeLeft,
    fetchUsage,
  };
}
