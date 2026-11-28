# MACASA IA — Correr localmente (Windows)

Tudo corre no teu PC: Supabase no Docker, IA no **Ollama**, emails só nos logs.
O Claude (Opus ou Fable) pode ser ligado só para comparar respostas.

## 0. Pré-requisitos

- **Node/npm** e **Docker Desktop** aberto (baleia a verde). O Supabase CLI corre via `npx supabase`.
- **Ollama** aberto, com o modelo instalado (`ollama list` deve mostrar `gemma4:e2b`; se não, `ollama pull gemma4:e2b`).

O MACASA usa portas próprias (família **5432x**), por isso pode correr ao mesmo tempo que o
Respondo (5542x) e o METAMORFOSE (5532x):

| Serviço | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| Base de dados | 127.0.0.1:54322 |
| Studio | http://127.0.0.1:54323 |
| Mailpit (emails de teste, `local_smtp`) | http://127.0.0.1:54324 |
| Site | http://localhost:8080 |

⚠️ O Supabase só lê `supabase/config.toml` ao arrancar: se o mudares, `npx supabase stop` e
`npx supabase start`.

## 1. Segredos (uma vez)

```powershell
copy supabase\functions\.env.example supabase\functions\.env
copy .env.local.example .env.local
```

Em `supabase\functions\.env` não precisas de mudar nada para usar o Ollama.

## 2. Arrancar o backend (terminal 1)

```powershell
npx supabase start
```

No fim mostra a `anon key` / `Publishable key` → **cola-a em `.env.local`** em
`VITE_SUPABASE_PUBLISHABLE_KEY` (só da primeira vez, ou se apagares os contentores).

Depois, no mesmo terminal:

```powershell
npx supabase functions serve --env-file supabase\functions\.env
```

Deixa este terminal aberto: aqui aparecem os logs das funções, incluindo o código de
verificação `[DEV_LOG_OTP]`.

## 3. Arrancar o site (terminal 2)

```powershell
npm install
npm run dev
```

Abre http://localhost:8080. Se a porta 8080 estiver ocupada, o Vite pára com erro (de propósito,
porque o login depende desta porta): fecha o outro projeto que a está a usar.

## 4. Testar

1. **Criar conta** → o código de 6 dígitos aparece no terminal 1 (`[DEV_LOG_OTP] Código para ...`).
2. **Resolver** um exercício (texto ou foto) → resposta do Ollama (a primeira demora mais: o modelo carrega).
3. **Tutor** → resposta em streaming.
4. **Tornar-se admin**: no Studio (http://127.0.0.1:54323) → SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'o-seu-email@exemplo.com';
   ```
5. Testes automáticos: `npm test`

## 5. Comparar com o Claude (opcional)

Em `supabase\functions\.env`:

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5-5      # ou claude-fable-5-2
```

Reinicia `npx supabase functions serve` (Ctrl+C e volta a correr). Para voltar ao Ollama:
`AI_PROVIDER=ollama`. Atenção: o Claude é pago por utilização.

## 6. Comparar modelos de IA (um só comando)

Com o Ollama aberto (não é preciso o Supabase nem o site):

```powershell
npm run avaliar:modelos
```

Testa **todos os modelos instalados** (exceto embeddings) com os mesmos prompts, limites e fluxo da
aplicação: Resolver em 4 passos (Matemática, Física e exercício por foto) e Tutor. Mede a carga, a parte
na GPU, o tempo e os tokens/s de cada passo, se o JSON é válido, se a resposta está certa, cortes,
passos acima do limite de 400 s, sinais de PT-PT vs PT-BR e fórmulas estragadas.
O relatório fica em `relatorios-modelos\<data>.md` (fora do git), com as respostas completas.

Opções: `npm run avaliar:modelos -- --modelos gemma4:e2b,qwen3.5:4b-q4_K_M` (só esses) e
`-- --claude` (inclui o Claude do `.env`; é pago). Com modelos grandes numa GPU de 4 GB pode demorar.

## 7. Stripe (opcional) — Premium por fatura mensal (cartão ou MB WAY)

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
| `AI_PROVIDER` | `ollama` (omissão) ou `anthropic` |
| `OLLAMA_URL` | Por omissão `http://host.docker.internal:11434` (o teu PC visto de dentro do Docker) |
| `OLLAMA_MODEL` | Por omissão `gemma4:e2b` (lê texto e imagens; escolhido pela avaliação de 28 nov: ~10× mais rápido que o e4b numa GPU de 4 GB) |
| `OLLAMA_NUM_CTX` | Janela de contexto, por omissão 8192 |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Só com `AI_PROVIDER=anthropic` |
| `EMAIL_PROVIDER` | `console` (local), `smtp` (Gmail) ou `resend` |
| `SMTP_*`, `RESEND_API_KEY`, `EMAIL_FROM` | Envio real de emails |
| `SITE_URL` | URL do site (links de cancelamento de email) |
| `DEV_LOG_OTP` | `true` só em local — mostra o código OTP nos logs |
| `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID` | Pagamentos |
| `SESSION_INACTIVITY_MIN`, `SESSION_MAX_HOURS` | Expiração das sessões |

## Limitações conhecidas em local

- Os emails do formulário de contacto e das mudanças de disciplina ficam numa fila
  (`process-email-queue`), que em produção é corrida pelo `pg_cron`. Em local não há agendamento;
  o código de verificação do registo não depende disto (é enviado na hora).

## Pendente para produção

- Criar projeto Supabase próprio (supabase.com), `supabase link` + `supabase db push` + `supabase functions deploy`.
- Agendar `process-email-queue` (pg_cron).
- Decidir a IA de produção (Ollama num servidor próprio ou API).
- Migrar utilizadores/dados existentes.
- Alojar o frontend (Vercel/Netlify) e apontar o domínio logicpathways.online.
- Colocar a imagem de partilha em `public/og-image.webp`.
