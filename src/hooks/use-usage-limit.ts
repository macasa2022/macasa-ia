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
        // Cooldown expired, reset
        await supabase
          .from("usage_tracking")
          .update({ question_count: 0, cooldown_until: null })
          .eq("user_id", user.id);
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

  const recordQuestion = useCallback(async () => {
    if (!user || !isLimited) return { allowed: true, warning: false };

    // Ensure record exists
    const { data: existing } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let currentCount = 0;

    if (!existing) {
      await supabase
        .from("usage_tracking")
        .insert({ user_id: user.id, question_count: 1 });
      currentCount = 1;
    } else {
      // Check cooldown
      if (existing.cooldown_until && new Date(existing.cooldown_until) > new Date()) {
        setCooldownUntil(new Date(existing.cooldown_until));
        return { allowed: false, warning: false };
      }

      // Reset if cooldown expired
      let count = existing.question_count;
      if (existing.cooldown_until && new Date(existing.cooldown_until) <= new Date()) {
        count = 0;
      }

      if (count >= MAX_QUESTIONS) {
        const cooldown = new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000);
        await supabase
          .from("usage_tracking")
          .update({ cooldown_until: cooldown.toISOString() })
          .eq("user_id", user.id);
        setCooldownUntil(cooldown);
        return { allowed: false, warning: false };
      }

      const newCount = count + 1;
      const update: any = { question_count: newCount, cooldown_until: null };
      
      if (newCount >= MAX_QUESTIONS) {
        const cooldown = new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000);
        update.cooldown_until = cooldown.toISOString();
        setCooldownUntil(cooldown);
      }

      await supabase
        .from("usage_tracking")
        .update(update)
        .eq("user_id", user.id);
      currentCount = newCount;
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
