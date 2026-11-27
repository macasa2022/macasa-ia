// Devolve a chave do Stripe só se estiver realmente configurada
// (ignora vazio e o marcador "sk_test_..." do .env.example).
export function getStripeKey(): string | null {
  const key = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!key || key.includes("...") || !/^(sk|rk)_(test|live)_/.test(key)) return null;
  return key;
}
