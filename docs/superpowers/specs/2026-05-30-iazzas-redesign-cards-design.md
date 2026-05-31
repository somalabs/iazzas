# IAzzas — Spec de execução do redesign profundo (cards Linear)

> **Ponte crítica → Linear.** Companion do `REDESIGN.md` (diagnóstico + direção + design system).
> Este doc é a spec dos **cards** (escopo, aceite, rota de agente, ondas). Brainstorm: 2026-05-30.
> Branch de trabalho: `design/claude-experience`. Workspace Linear: Lemos (LEM), projeto iazzas.

---

## 0. Por que existe (contexto curto)

O IAzzas é o LibreChat de chapéu navy: shell master-detail de 3 colunas montado (coluna do meio
morta), Playfair carregada mas nunca usada, PT-BR é stub (inglês vaza da camada de dados), 3-4 cores
de botão competindo, zero identidade de moda. Os ajustes anteriores foram cosméticos sobre um
esqueleto não-redesenhado. Este sprint muda o **esqueleto** (IA, tipografia, disciplina de cor,
imagem), não a tinta. Norte: **IAzzas vira o atelier digital da Azzas 2154 — tela única calma sobre
clima creme, composer protagonista, Playfair como voz, fotografia de produto como material.**

## 1. Design system (tokens — fonte de verdade pros agentes)

```
--canvas:      #F9F6EA   /* creme: fundo do app inteiro. NUNCA branco puro. */
--paper:       #FFFFFF   /* cards/composer flutuantes sobre o creme */
--rule:        #E6E0CF   /* hairline quente; nunca borda cinza */
--ink-900:     #1C2B38   /* títulos */
--ink-700:     #3D5A73   /* steel: texto secundário, ícones em repouso */
--ink-500:     #6E7E8C   /* helper/caption */
--action:      #274566   /* azzas-navy — ÚNICA cor de botão preenchido no produto */
--action-hover:#1C3450
--on-action:   #F9F6EA
--ember:       #C25A3C   /* terracota — SÓ status "ativo/live" e marcador de nav ativa. Nunca botão. */
```
**Deletar:** brand-purple, verde-OpenAI, violeta, preto-quase (#1a1a1a). **Navy é o único fill.**
Foco/seleção: navy 14% alpha, 2px.

**Tipografia:** Playfair Display (só voz: saudações/H1/heróis/taglines, 24–40px, peso 500,
tracking −0.5px; nunca <24px, nunca em botão/label). Red Hat Display (todo o resto operacional).

**Espaço:** base 8px; margem externa 64px; medida de leitura **760px** centralizada. Duas elevações
só: canvas (creme flat) e superfície flutuante (paper + 1px `--rule` + sombra suave). Só composer e
gaveta são elevados. Raio 14 cards/composer · 10 inputs · 8 botões · full avatares/dots.

## 2. Modelo de execução

- **Épico (sem `agent:*` label)** + **14 filhas**. Épico sem label = não dispara o agente-líder
  (puramente organizacional). Eu (main-loop) coordeno; sem auto-decomposição, sem auto-síntese.
- **Gatilho do dispatcher:** card só vira run de agente no Railway quando está em **`Todo` +
  `agent:<papel>`**. Backlog = dormente. Sem `agent:*` label = shape interativo (humano primeiro).
- **Deps:** geridas em **ondas manuais**. Não uso `<!--sc-after-->` (ele só serializa por *papel*
  entre irmãos — fraco demais pro DAG cruzado deste sprint). Promovo Backlog→Todo onda a onda.
- **Verificação:** ao fim de cada onda subo o app e comparo via Playwright/visual com o Artur;
  **1 card `agent:qa` final** como gate antes do PR.
- **Cards auto-contidos:** REDESIGN.md pode não estar no remote que o agente clona — então cada card
  carrega aceite completo, sem depender de ler outro arquivo.

## 3. Ondas

- **Onda 0 (dispara já):** P0-B (tokens) + P0-C (PT-BR) — independentes, sem colisão com o shell.
- **Onda shape (interativo comigo):** P0-A (matar shell) → P0-D (Playfair) → P1-A (composer). P0-A é
  o keystone: reestrutura componentes e **absorve a limpeza de cor por-componente** + mover balance
  widget pra Settings. Bloqueia P1-A/B, P2-A, P3-B.
- **Onda 1 (após P0-A):** P1-B, P1-C, P1-D.
- **Onda 2 (após P0+P1):** P2-A, P2-B, P2-C.
- **Onda 3 (polish):** P3-A, P3-B.
- **Gate final:** QA-final antes do PR.

## 4. Cards

Convenção de título: `[redesign] <P#-X> · <verbo>`. Cada filha aponta o épico como parent.

### P0 — Esqueleto

**P0-A · Matar o shell master-detail → régua + palco + gaveta Atelier**
`sem label (shape comigo) → agent:tech depois` · bloqueia P1-A/B, P2-A, P3-B
- Remover a coluna-do-meio master-detail permanente em Chat/Studio/Agentes/Flows/Automações.
- Modelo espacial: **régua** (esq, ~64–72px, paper-white + hairline quente; ícone-only, rótulo no
  hover/pin; active = plate navy + marcador terracota 3px + ícone preenchido) + **palco** único
  (canvas creme full-bleed) + **gaveta "Atelier"** sob demanda à direita (histórico/criações/runs/
  agentes vivem aqui, fechada por padrão), idêntica nas 5 ferramentas.
- Empty-states full-bleed (headline Playfair + 1 imagem duotone + 1 CTA navy + 3 chips de exemplo);
  **nunca** caixa tracejada "aparecerão aqui". Skeletons creme no load (sem flash de vazio).
- **Absorve:** aplicar a paleta do P0-B nos componentes reestruturados (cor por-componente: matar
  botões pretos de Agentes, verde de "Gerar", etc.) + mover balance widget/"Renova hoje" pra
  Configurações > Uso; pé da régua só com avatar; footer "Azzas 2154" promovido a tagline Playfair.
- Alvos: `client/src/components/Nav` (UnifiedSidebar), `components/Chat`, `components/Studio`,
  `components/Automacoes`, `client/src/routes/Dashboard.tsx`.

**P0-B · Clima creme + cor única — camada de tokens** 🔴 dispara já
`agent:tech` (Todo)
- `--canvas:#F9F6EA` no body/app-root; nenhuma superfície de app em branco puro.
- Definir a paleta §1 inteira como tokens (canvas/paper/rule/ink-900/700/500/action/action-hover/
  on-action/ember) em `client/src/style.css` + `tailwind.config.cjs`.
- navy `--action` é o **único** token de fill de botão. **Remover as defs** de purple, verde-OpenAI,
  violeta, preto-quase dos arquivos de token/tema (e o chrome de endpoint verde).
- **Zero edição de componente** — só camada de tokens/tema (a aplicação por-componente é do P0-A).
- App builda e sobe no creme; foco/seleção navy 14% 2px.
- *Substitui o colorize cosmético anterior (LEM-78) por uma reescrita de sistema.*

**P0-C · PT-BR fonte de verdade** 🔴 dispara já
`agent:produto` (Todo)
- `pt-BR` espelha 100% das chaves de `en` (sem fallback-inglês visível nas telas auditadas).
- Default locale forçado pt-BR.
- Nomes de endpoint/modelo movidos pra i18n (não vazam da camada de dados).
- Strings mortas eliminadas: *Happy weekend · Please select an Agent · My Agents · Welcome back ·
  Settings · Log out · Flows*.
- Nav pt-BR (verbos-de-intenção): **Conversar · Estúdio · Agentes · Fluxos · Automações**.
- Alvos: `client/src/locales/pt-BR`, data-provider, config de locale default.
- *Escopo é string/i18n. A auto-seleção do agente default ("Please select an Agent" como
  comportamento) é do P1-A — aqui só some a string.*

**P0-D · Playfair como voz**
`sem label (shape comigo) → agent:design depois`
- Aplicar Playfair em saudações/H1/heróis de empty-state/taglines (24–40px, peso 500, tracking −0.5).
- Red Hat em todo o resto (nav 14/600, body 15/1.55, labels 13/600 uppercase, botões 15/600).
- Saudação time-aware: "Bom [período], [nome]." (só primeiro nome, sem ícone de robô).
- Alvos: `components/Chat` (Landing), headings globais.

### P1 — Hierarquia e primitivos

**P1-A · Composer como herói + agente pré-selecionado**
`sem label (shape comigo) → agent:tech depois` · dep P0-A
- Composer card paper 760px, raio 14, hairline + sombra — **o único elemento elevado**.
- Chip navy "para [Agente ▾]" no topo-esquerdo, default já selecionado (mata "Please select an
  Agent"); o chip abre popover de agentes como foto-cards. Modelo vai pra "⋯ Avançado".
- 3–4 chips de ponto-de-partida sob o composer (creme/hairline, NÃO navy): ferramentas-como-modos.
- Send = a única ação navy; escurece/anel terracota no primeiro keystroke.
- Alvos: `components/Chat/Input`, `components/Input`.

**P1-B · Active-nav + régua redesenhada**
`agent:design` · dep P0-A
- Marcador terracota 3px + ícone preenchido + plate no item ativo (hoje não existe active-state).
- Remover subtítulos de 2 linhas dos itens de nav; promover footer a tagline Playfair-itálica.
- Alvos: `components/Nav` / `UnifiedSidebar/ExpandedPanel`.

**P1-C · Set de ícones custom**
`agent:design` · dep P0-B, P1-B
- 1.5px stroke, grid 24px, joins arredondados, cor steel, variante preenchida no ativo.
- Vocabulário de moda (cabide=Estúdio, manequim=Agentes, carretel=Fluxos). Aposentar Lucide
  (terminal/git-branch/balança) e ícones de robô.

**P1-D · Confirmação inline + ações de linha sempre visíveis**
`agent:tech` · independente (pode adiantar)
- Sem `window.confirm`: a linha vira "Excluir? [Excluir] [Cancelar]" no lugar.
- Ações de linha sempre visíveis (não hover-only), text-buttons steel à direita.
- Alvos: listas de Automações/Agentes/Conversas.

### P2 — Imagem como material

**P2-A · Fotografia de produto nos cards (crop 4:5)**
`agent:design` · dep P0-A, P0-B
- Resultados do Estúdio, cards de Agente e trabalho-recente carregam crop editorial 4:5 sobre
  seamless creme. Alvos: `components/Studio`, `components/Agentes`.

**P2-B · Duotone editorial nos empty-states/auth**
`agent:design` · dep P0-B
- Empty-states usam imagem de campanha Azzas (duotone navy-sobre-creme ~8%) atrás da saudação, ou
  full-bleed em conta nova. Auth idem. Alvos: empty-states, `components/Auth/AuthLayout`.

**P2-C · Auth SSO-first**
`agent:tech` · dep P0-B, P0-C
- "Entrar com Microsoft" = botão navy primário; e-mail/senha colapsam sob disclosure "ou usar
  e-mail". Alvos: `components/Auth`.

### P3 — Motion e polish

**P3-A · Motion material**
`agent:tech` · dep P1, P2
- 180ms ease-out popovers/cards; resultados revelam como foto (shimmer creme → fade 240ms);
  marcador de nav desliza; **sem bounce/spring**; "gerando" = dot terracota pulsando 1.4s (nunca
  spinner). Global.

**P3-B · Skeletons creme em todo load**
`agent:tech` · dep P0-A
- Shimmer creme em todo carregamento; nunca flash de vazio. Global.

### Gate

**QA-final · Gate Playwright pré-PR**
`agent:qa` · dep tudo
- Validar na branch `design/claude-experience`: creme em todas as telas, sem purple/green/black,
  PT-BR sem vazamento de inglês, shell novo (sem coluna morta), Playfair nas saudações.
- Regressão: login, /d/studio, /d/automacoes funcionando. Gate antes de abrir o PR.

## 5. Disparo inicial

Crio o épico + 14 filhas. **Em `Todo` (dispara já):** P0-B (`agent:tech`), P0-C (`agent:produto`).
Shape (P0-A/D, P1-A) em Backlog sem label. Demais em Backlog com label (dormentes). Eu monitoro os
2 runs no Railway (modo babá) e verifico a Onda 0 via Playwright antes de promover a próxima onda.
