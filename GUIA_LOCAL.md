# MACASA IA — Correr localmente (Windows)

Versão independente do Lovable: IA com **Claude Fable** (API Anthropic), emails por
**Resend** (ou só nos logs, em local) e Supabase próprio.

## 0. Pré-requisitos

Nada de novo a instalar se já usa o metamorfose-finance: basta **Node/npm** e o
**Docker Desktop** aberto (ícone da baleia a verde). O Supabase CLI corre via `npx supabase`.

⚠️ Só pode haver **um** Supabase local a correr de cada vez (as portas 54321–54324 são as
mesmas). Antes de arrancar este, pare o outro projeto:

```powershell
cd "C:\Users\nadin\Documents\MESTRES DA IA\CURSO DE CLAUDE\Projeto01\metamorfose-finance"
npx supabase stop
```

## 1. Segredos (uma vez)

Na pasta do projeto:

```powershell
copy supabase\functions\.env.example supabase\functions\.env
copy .env.local.example .env.local
```

Abra `supabase\functions\.env` no Bloco de Notas/VS Code e cole a sua
`ANTHROPIC_API_KEY`. (O Stripe pode ficar para depois.)

## 2. Arrancar o backend (terminal 1)

```powershell
npx supabase start
```

A primeira vez demora (descarrega imagens Docker). No fim mostra, entre outros:
- `API URL` → http://127.0.0.1:54321
- `Studio URL` → http://127.0.0.1:54323 (painel da base de dados)
- `Mailpit/Inbucket URL` → caixa de correio de teste
- `anon key` / `Publishable key` → **copie para `.env.local`** em `VITE_SUPABASE_PUBLISHABLE_KEY`

Depois, no mesmo terminal:

```powershell
npx supabase functions serve --env-file supabase\functions\.env
```

Deixe este terminal aberto: é aqui que aparecem os logs das funções
(incluindo o código de verificação `[DEV_LOG_OTP]`).

## 3. Arrancar o site (terminal 2)

```powershell
npm install
npm run dev
```

Abra http://localhost:8080

## 4. Testar

1. **Criar conta** → o código de 6 dígitos aparece no terminal 1 (`[DEV_LOG_OTP] Código para ...`).
2. **Resolver** um exercício (texto ou foto) → resposta do Fable.
3. **Tutor** → resposta em streaming.
4. **Tornar-se admin**: no Studio (http://127.0.0.1:54323) → SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'o-seu-email@exemplo.com';
   ```
5. Testes automáticos: `npm test`

## 5. Stripe — Premium por fatura mensal (cartão ou MB WAY)

Como funciona: ao clicar em «Começar Premium» abre-se uma janela com a fatura do Stripe,
onde o aluno paga com **cartão ou MB WAY**. Todos os meses o Stripe emite e envia por email
uma nova fatura, com **2 dias** para pagar. Enquanto a renovação está por pagar, a app mostra
um aviso; se o prazo passar, a subscrição é cancelada e a conta volta ao **Gratuito**.

Configuração (modo de teste):
1. dashboard.stripe.com → ativar **Test mode / Sandbox**.
2. **Settings → Payment methods** → ativar **MB WAY** (e cartões).
3. **Products** → criar “Premium”, preço recorrente **9,99 € / mês** → copiar o `price_...`.
4. **Developers → API keys** → copiar a `sk_test_...`.
5. Pôr ambos em `supabase\functions\.env` (`STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID`).
   As funções recarregam sozinhas; se não, reinicie `npx supabase functions serve`.
6. Recomendado em **Billing → Settings → Manage invoices sent to customers**: cancelar a
   subscrição se a fatura ficar por pagar depois do prazo (a app também o faz quando o aluno entra).

Pagar em teste: cartão `4242 4242 4242 4242` (data futura, CVC qualquer) ou MB WAY com os
números de teste do Stripe (docs.stripe.com/payments/mb-way/accept-a-payment).
Em modo de teste o Stripe não envia emails reais aos clientes.

## Parar

`Ctrl+C` nos terminais e `npx supabase stop`.

## Variáveis das Edge Functions

| Variável | Para quê |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic (obrigatória) |
| `ANTHROPIC_MODEL` | Modelo (por omissão `claude-fable-5-2`) |
| `EMAIL_PROVIDER` | `console` (local), `resend` (produção) ou `lovable` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio real de emails via Resend |
| `SITE_URL` | URL do site (links de cancelamento de email) |
| `DEV_LOG_OTP` | `true` só em local — mostra o código OTP nos logs |
| `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID` | Pagamentos |

## O que mudou face ao Lovable

- `supabase/functions/_shared/anthropic.ts` — cliente Claude; converte o streaming para o formato
  que o frontend já lia, por isso `src/` não mudou.
- `mentor-ai` — usa o Fable em vez de `ai.gateway.lovable.dev`.
- `_shared/send-email.ts` + `process-email-queue` — emails via Resend/console em vez do Lovable.
- `send-verification-code` — `DEV_LOG_OTP` para ver o código em local.
- `create-checkout`, `admin-subscriptions` — preço Stripe configurável.

- Segurança: limite do plano Gratuito contado no servidor (`consume_question`), email do perfil bloqueado,
  um email = uma conta (variantes `+etiqueta` e pontos do Gmail incluídas).
- Histórico de exercícios real (`exercise_attempts`) e Premium atribuído pelo admin sem Stripe.

- Uma sessão ativa por conta (`session-guard`): ao entrar noutro dispositivo o aluno escolhe transferir;
  aviso por email em dispositivos novos; «Definições → Sessões e segurança» para terminar outras sessões e
  mudar a palavra-passe; expira após 60 min de inatividade ou 12 h. Suspensão só manual (Admin).
- Conversas do Tutor guardadas; Plano de Estudo gerado pela IA a partir do histórico.
- Plano Gratuito: disciplina verificada no servidor.

## Pendente para produção

- Criar projeto Supabase próprio (supabase.com), `supabase link` + `supabase db push` + `supabase functions deploy`.
- Agendar `process-email-queue` (pg_cron) — no Lovable era criado fora das migrações.
- Migrar utilizadores/dados existentes do Lovable Cloud.
- Alojar o frontend (Vercel/Netlify) e apontar o domínio logicpathways.online.
