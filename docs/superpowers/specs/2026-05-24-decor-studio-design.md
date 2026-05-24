# Decor Studio — Design Spec

**Goal:** Produto B2C de geração de imagens para design de interiores, permitindo que usuários finais façam mudanças objetivas em fotos de seus ambientes (cor de parede, piso, móveis) via IA generativa.

**Arquitetura:** Next.js 14 (App Router) full-stack com API Routes, Supabase como backend-as-a-service (auth + Postgres + storage) e OpenRouter como gateway de modelos de imagem. UX inspirado no Studio de moda do iazzas: workspace com casos de uso + histórico de projetos + detail view com edição inline.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (Auth + Postgres + Storage), OpenRouter API, React Context + Reducer, Vercel (deploy)

---

## 1. Casos de Uso (MVP)

Três casos de uso para o MVP, estruturados como schemas (análogos ao `USE_CASE_SCHEMAS` do Studio iazzas):

### `wall_color` — Trocar Cor de Parede
- **Image slots:**
  - `room_photo` (obrigatório) — foto do ambiente a ser modificado
  - `color_reference` (opcional) — imagem de referência de cor/paleta
- **Form fields:**
  - `target_color` (text, obrigatório) — cor desejada (ex: "off-white", "verde sage", "cinza chumbo")
  - `which_walls` (text, opcional) — quais paredes (ex: "todas", "só a parede do fundo")
  - `style_notes` (text, opcional) — notas adicionais
- **Aspect ratio padrão:** 4:3
- **Image count padrão:** 4

### `floor_change` — Trocar Piso
- **Image slots:**
  - `room_photo` (obrigatório)
  - `material_reference` (opcional) — foto do material/piso desejado
- **Form fields:**
  - `target_material` (text, obrigatório) — ex: "piso de madeira clara", "porcelanato cinza", "mármore branco"
  - `style_notes` (text, opcional)
- **Aspect ratio padrão:** 4:3
- **Image count padrão:** 4

### `furniture_swap` — Trocar Móvel
- **Image slots:**
  - `room_photo` (obrigatório)
  - `furniture_reference` (opcional) — foto da nova peça desejada
- **Form fields:**
  - `target_furniture` (text, obrigatório) — qual peça trocar (ex: "sofá", "mesa de centro")
  - `replacement_description` (text, obrigatório) — como deve ficar (ex: "sofá de linho bege em L")
  - `style_notes` (text, opcional)
- **Aspect ratio padrão:** 4:3
- **Image count padrão:** 4

Cada schema define também um `defaultModel` (modelo OpenRouter), configurável por caso de uso.

---

## 2. Arquitetura

### Estrutura de pastas (Next.js App Router)

```
/app
  /api
    /generate/route.ts       — recebe payload, chama OpenRouter, persiste no Supabase
    /projects/[id]/route.ts  — polling de status de um projeto
    /projects/route.ts       — listagem de projetos do usuário autenticado
    /upload/route.ts         — upload de imagem de referência para Supabase Storage
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(app)
    /page.tsx                — workspace principal (redireciona para /studio)
    /studio/page.tsx         — workspace + histórico
    /studio/[id]/page.tsx    — detail view de um projeto

/components
  /Studio
    /context.tsx             — StudioProvider, reducer, hooks (replicar padrão iazzas)
    /schemas.ts              — USE_CASE_SCHEMAS para interiores
    /View.tsx                — layout root (topbar + conteúdo)
    /workspace
      /Workspace.tsx
      /UseCaseSelector.tsx
      /ReferenceUploader.tsx
      /FormFields.tsx
      /GenerateButton.tsx
    /detail
      /ProjectDetail.tsx
      /ImageDetail.tsx
      /InlineEditor.tsx
    /creations
      /CreationCard.tsx
      /CreationGrid.tsx

/lib
  /supabase
    /client.ts               — Supabase browser client
    /server.ts               — Supabase server client (para API Routes)
  /prompts
    /wall-color.ts           — fn pura: (formValues, imageUrls) => string
    /floor-change.ts
    /furniture-swap.ts
  /openrouter.ts             — wrapper de chamada ao OpenRouter API

/types
  /index.ts                  — DecorProject, DecorImage, UseCaseSchema, etc.
```

### Componentes reutilizados do Studio iazzas

Os seguintes padrões são copiados e adaptados (não compartilhados via npm):

- `context.tsx` — reducer com `ADD_PROJECT`, `UPDATE_PROJECT`, `REPLACE_PROJECT`, `HYDRATE_PROJECTS`, `SELECT_PROJECT`, `SET_MODE`, `SET_USE_CASE`
- `InlineEditor.tsx` — bottom sheet de edição inline com upload de referência
- `CreationCard.tsx` e `CreationGrid.tsx` — grid de histórico com estado `generating/done/error`
- Lógica de polling — `refetchInterval` baseado em status `generating`
- Lógica de otimismo — UUID local → substituição pelo ID do servidor via `REPLACE_PROJECT`

---

## 3. Modelo de Dados (Supabase Postgres)

```sql
-- auth.users gerenciado pelo Supabase Auth

create table projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  use_case     text not null,       -- 'wall_color' | 'floor_change' | 'furniture_swap'
  prompt       text not null,       -- prompt final enviado ao modelo
  status       text not null,       -- 'generating' | 'done' | 'error'
  form_values  jsonb default '{}',  -- valores dos campos do formulário
  model        text,                -- modelo OpenRouter utilizado
  image_count  int default 4,
  aspect_ratio text default '4:3',
  created_at   timestamptz default now()
);

create table project_images (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects on delete cascade,
  type         text not null,       -- 'input' | 'output'
  slot_id      text,                -- 'room_photo', 'color_reference', etc.
  storage_url  text not null,       -- URL pública no Supabase Storage
  file_id      text,                -- path no bucket
  width        int,
  height       int,
  position     int default 0        -- ordem das imagens output
);

-- RLS: usuário só acessa os próprios projetos
alter table projects enable row level security;
alter table project_images enable row level security;

create policy "own projects" on projects
  using (auth.uid() = user_id);

create policy "own project images" on project_images
  using (project_id in (select id from projects where user_id = auth.uid()));
```

---

## 4. Fluxo de Geração

```
1. Usuário preenche form + sobe foto do ambiente
2. Frontend faz POST /api/upload → salva imagem no Supabase Storage → retorna storage_url
3. Frontend exibe projeto otimista (UUID local, status='generating') na UI
4. Frontend faz POST /api/generate com { useCase, formValues, inputImages, model, imageCount, aspectRatio }
5. API Route:
   a. Valida sessão via Supabase Auth cookie
   b. Insere projeto no Postgres com status='generating'
   c. Monta prompt via lib/prompts/[use-case].ts
   d. Chama OpenRouter (modelo configurado no schema)
   e. Salva imagens geradas no Supabase Storage
   f. Atualiza projeto: status='done', insere project_images (type='output')
   g. Retorna projeto completo
6. Frontend substitui projeto otimista pelo projeto real (REPLACE_PROJECT)
7. Se a chamada demorar > timeout do Vercel: frontend faz polling GET /api/projects/[id]
   → para quando status != 'generating'
```

**Nota sobre timeout do Vercel:** API Routes têm limite de 60s (plano Pro). Gerações de imagem via OpenRouter tipicamente levam 10-40s. Para MVP, a rota bloqueia até a geração concluir e retorna o projeto completo. Se geração ultrapassar o limite, o frontend detecta via polling e exibe o resultado quando disponível. Migrar para Vercel Background Functions é a evolução natural se necessário.

### Montagem de prompt (exemplo para `wall_color`)

```typescript
// lib/prompts/wall-color.ts
export function buildPrompt(
  formValues: { target_color: string; which_walls?: string; style_notes?: string },
  inputImages: { slot_id: string; storage_url: string }[]
): string {
  const walls = formValues.which_walls ?? 'todas as paredes';
  const notes = formValues.style_notes ? ` ${formValues.style_notes}.` : '';
  return `Change ${walls} to ${formValues.target_color}.
    Preserve all furniture, flooring, lighting, and room layout exactly as-is.
    Only modify the wall surfaces.${notes}`;
}
```

---

## 5. Autenticação

- Supabase Auth com email/senha + providers sociais (Google no mínimo)
- Middleware Next.js (`middleware.ts`) protege todas as rotas `/(app)/**`
- Usuário não autenticado é redirecionado para `/login`
- Sessão gerenciada via cookies httpOnly (Supabase SSR helper)

---

## 6. UI/UX

- **Paleta:** warm neutral — fundo `#111`, superfícies `#1a1a1a` / `#2a2520`, acento `#c9b99a` (areia)
- **Aspect ratio:** 4:3 para todos os thumbnails e imagens geradas (ambientes são mais largos que peças de roupa)
- **Layout desktop:** painel esquerdo fixo (280px) com form + painel direito com grid de projetos
- **Layout mobile:** bottom sheet para o form, scroll vertical de projetos
- **Estados de card:** `generating` (shimmer/spinner), `done` (imagem), `error` (ícone + retry)
- **InlineEditor:** mesmo padrão do Studio — bottom sheet com textarea + upload de referência + submit

---

## 7. Fora do Escopo (MVP)

- Redesign livre de estilo/mood ("deixe meu quarto mais escandinavo")
- Comparação before/after lado a lado
- Compartilhamento público de projetos
- Planos pagos / paywall
- Mobile app nativo
- Outros provedores além do OpenRouter
