# Psicossocial SST (HSE-IT) — contexto para o Claude Code

## O que é
SaaS multi-tenant para engenheiros de SST: cadastro de empresas clientes, campanhas de avaliação psicossocial, link público para funcionários, relatórios PDF (modelo AEP). Metodologia: **HSE-IT** (35 questões, 7 domínios).

## Stack
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind (paleta escura no `tailwind.config.ts` e `globals.css`).
- **Backend:** Supabase (Auth + Postgres + Storage bucket `logos`).
- **Formulários:** react-hook-form + zod.
- **Gráficos:** Recharts.
- **PDF:** jsPDF (`src/lib/pdf-report.ts`).

## Comandos
```bash
cd /Users/braguera/Documents/hse-saas   # ou o caminho onde o repo estiver
npm install
cp .env.local.example .env.local       # preencher Supabase
npm run dev
npm run build                          # validar antes de PR
```

## Variáveis de ambiente
Ver `.env.local.example`. Obrigatório para auth/crud: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.

## Banco
Esquema SQL e RLS: `supabase/schema.sql` (rodar no SQL Editor do Supabase). Criar bucket **`logos`** e políticas de Storage. Habilitar **Realtime** em `employee_responses` para contador na campanha.

## Pastas importantes
- `src/lib/hse-scoring.ts` — motor HSE (classificação, agregações, conclusões).
- `src/lib/hse-questions.ts` — 35 questões PT-BR.
- `src/lib/supabase/client.ts` | `server.ts` | `middleware.ts`.
- `src/app/(auth)/` — login, registro.
- `src/app/(dashboard)/` — app autenticado.
- `src/app/form/[slug]/` — formulário público (sem login).
- `src/components/ui/` — componentes base.

## Regras de produto
- UI e mensagens em **português (Brasil)**.
- Não usar fundo branco puro; seguir tokens `background`, `surface`, `card`, `accent`, etc.
- Tratar erros das chamadas Supabase; estados de loading em ações async.

## Próximos passos típicos
- Ajustar textos legais do PDF ao manual interno do cliente.
- Endurecer RLS (ex.: listagem pública de campanhas) se necessário.
- Testes E2E ou Playwright (não existe ainda).
