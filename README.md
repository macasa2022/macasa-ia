# MACASA IA — Mentor das Exatas

Plataforma de tutoria com IA para alunos do 7.º ao 12.º ano: resolução de exercícios de
Matemática, Física e Química passo a passo (texto ou foto), tutor em conversa, plano de
estudo e histórico. Site: [logicpathways.online](https://logicpathways.online).

## Tecnologia

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Edge Functions em Deno), local no Docker
- **IA:** Ollama local (`gemma4:e2b`); Claude (Opus/Fable) como alternativa para comparar
  respostas (`AI_PROVIDER=anthropic`)
- **Emails:** consola (local), SMTP/Gmail ou Resend
- **Pagamentos:** Stripe (cartão e MB WAY) — opcional em local

## Correr localmente

Ver **[GUIA_LOCAL.md](GUIA_LOCAL.md)** (Windows, passo a passo).

Resumo:

```powershell
npx supabase start                                            # backend (portas 5432x)
npx supabase functions serve --env-file supabase\functions\.env
npm install
npm run dev                                                   # http://localhost:8080
```

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/` | Aplicação React (páginas, componentes, contextos) |
| `supabase/migrations/` | Esquema da base de dados |
| `supabase/functions/` | Edge Functions (`mentor-ai` = IA; emails; sessões; Stripe) |
| `supabase/functions/_shared/ai.ts` | Cliente de IA (Ollama / Anthropic) |
| `docs/` | Especificação original do produto |

## Testes

```powershell
npm test          # testes unitários (Vitest)
npm run build     # verificação da build de produção
```
