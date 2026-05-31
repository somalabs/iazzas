# IAzzas — Redesign Direction (deep critique → new product face)

> Fonte: crítica multi-agente (13 críticos sobre screenshots reais das 18 telas + 3 lentes de redesign) em 2026-05-30.
> Screenshots da auditoria: `/tmp/iazzas-audit/` (01-login … 34-m-automacoes).
> Este doc é a ponte entre a crítica e a execução no Linear. Branch base: `design/claude-experience`.

---

## 1. Diagnóstico honesto (por que ainda parece amador)

**O IAzzas é o LibreChat usando um chapéu navy.** O esqueleto estrutural (shell master-detail de três colunas do LibreChat) continua montado e vaza para o usuário como **colunas mortas/vazias** ("Chats", "Suas criações aparecerão aqui", Automações duplicando título+CTA sobre um canvas vazio). A identidade Azzas foi aplicada como **recoloração** (faixa navy + troca de tokens) por cima de um corpo branco genérico de SaaS. A Playfair Display está carregada mas **não é usada em lugar nenhum** — então não há voz editorial. O idioma é **meio-inglês** ("Happy weekend", "Please select an Agent", "My Agents", "Welcome back", "Settings", "Log out") porque só as strings de superfície foram traduzidas. Há **3-4 cores de botão competindo** (navy, preto, verde, roxo) porque os primitivos foram emprestados, não desenhados. E há **zero identidade de moda** — nenhuma imagem, nenhum calor, nenhuma "Azzas-ness" além do logo.

As mudanças anteriores (recolor do auth, faixa navy, copy) foram cosméticas porque trataram sintomas sobre um esqueleto LibreChat não-redesenhado. Para virar premium, o **esqueleto** (IA, sistema tipográfico, disciplina de cor, imagem) precisa mudar — não a tinta.

---

## 2. Temas estruturais (do diagnóstico, priorizados)

| # | Tema | Sev | Telas afetadas |
|---|------|-----|----------------|
| 1 | **Shell master-detail do LibreChat montado** → telas abrem em empty-states mortos/competindo | **P0** | Chat, Studio, Agentes, Flows, Automações |
| 2 | **Playfair Display carregada mas usada quase em lugar nenhum** → sem voz editorial | **P0** | Chat, Studio, Agentes, Flows, Auth |
| 3 | **Locale PT-BR é um stub; inglês vaza da camada de dados** | **P0** | Auth, Chat, Nav, Agentes, Flows |
| 4 | **Sem cor primária única: roxo + verde OpenAI + navy + preto coexistem** | **P0** | Auth, Agentes, Composer, Flows |
| 5 | **Primitivos LibreChat/Lucide carregam semântica de dev** (sem active-nav, balance widget, window.confirm, ícones de robô) | **P1** | Nav, Studio, Account menu |
| 6 | **Hierarquia de interação invertida ou ausente** (composer menor que a saudação, "Please select an Agent" como parede, ações em hover) | **P1** | Auth, Composer, Studio, Automações |

**P0 list (ordem de impacto na percepção):**
1. Matar o shell master-detail (a coluna do meio morta).
2. PT-BR como fonte de verdade.
3. Uma cor primária só (navy).
4. Promover Playfair para títulos/saudações.
5. Substituir primitivos emprestados.
6. Remapear a hierarquia (composer como herói).

---

## 3. Direção unificada (norte)

As três lentes (Fashion-editorial · Claude-native · Radical-IA) convergiram quase ponto a ponto. A síntese:

> **IAzzas vira o *atelier digital* da Azzas 2154: uma tela única e calma sobre clima creme, onde o *composer* é o protagonista, cada ferramenta (Estúdio, Agentes, Fluxos, Automações) é invocada dentro da mesma conversa, a Playfair fala a voz da marca e a fotografia de produto é o material — não um LibreChat recolorido.**

Three lanes → o que entra de cada:
- **Claude-native:** a calma, o composer-como-herói com agente pré-selecionado, ferramentas-como-modos (chips de ponto de partida), disciplina de "uma cor / um elevado por tela".
- **Fashion-editorial:** o clima creme, a Playfair como voz, a fotografia de produto como material de primeira classe, a tipografia editorial.
- **Radical-IA:** o modelo espacial **uma régua + um palco + uma gaveta "Atelier" sob demanda** que substitui TODAS as colunas do meio, e os nomes verbos-de-intenção.

---

## 4. Design System (concreto)

### Cor — um clima, uma ação
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
--ember:       #C25A3C   /* terracota (do avatar AL) — SÓ status "ativo/live" e marcador de nav ativa. Nunca botão. */
```
**Deletar por completo:** brand-purple (link "Sign up"), verde OpenAI (CTA "Gerar" e chrome de endpoint), violeta, e os botões preto-quase (#1a1a1a) de Agentes. **Navy é a única cor de fill.** Tudo o mais é texto-sobre-creme ou outline hairline. Foco/seleção: navy 14% alpha, 2px.

### Tipografia — Playfair é a voz, Red Hat é o corpo
- **Playfair Display** (só): saudações, H1, heróis de empty-state, taglines. 24–40px, peso 500, tracking −0.5px. Nunca abaixo de 24px, nunca em botão/label.
- **Red Hat Display:** todo o resto operacional. Nav 14/600, body 15/1.55, labels 13/600 uppercase +tracking, placeholder 15, botões 15/600.
- **Regra:** se é nome/saudação/título de destino → Playfair. Se é controle ou frase-para-agir → Red Hat.

### Espaço, superfície, raio
- Base 8px. Margem externa 64px desktop, gutter 32px, ritmo vertical 48px. **Medida de leitura/composição: máx 760px centralizado** (o vazio vira margem editorial medida, como uma revista).
- Duas elevações só: canvas (creme, flat) e superfície flutuante (paper + 1px `--rule` + sombra `0 1px 2px rgba(28,43,56,.04), 0 8px 24px rgba(28,43,56,.06)`). **Só o composer e a gaveta são elevados.** Sem glassmorphism.
- Raio: 14px cards/composer, 10px inputs, 8px botões, full-round avatares/dots.

### Imagem — material de marca, não decoração
Fotografia de produto é de primeira classe: cada resultado do Estúdio, card de Agente e card de trabalho-recente carrega um crop editorial 4:5 sobre seamless creme. Empty-states usam **uma imagem de campanha Azzas (Arezzo/Soma)** full-bleed, ou um duotone navy-sobre-creme a ~8% atrás da saudação. **Pela primeira vez o produto sussurra "Arezzo+Soma" em vez de gritar com uma faixa navy.**

### Ícones e motion
- Aposentar o set Lucide (terminal, git-branch, balança) e os ícones de robô. **Um set custom 1.5px stroke, grid 24px, joins arredondados, cor steel**, com variante preenchida no ativo. Vocabulário de moda (cabide=Estúdio, manequim=Agentes, carretel=Fluxos).
- Motion contido e material: 180ms ease-out para popovers/cards; resultados "revelam" como foto (shimmer creme → fade-in 240ms); marcador de nav ativa desliza; **sem bounce/spring** (lê brinquedo, não casa de moda). "Gerando" = um dot terracota pulsando 1.4s, nunca spinner.

---

## 5. Nova Arquitetura de Informação

### Matar a coluna do meio (o maior sinal de amador)
Em toda tela a coluna-do-meio master-detail ou está vazia ("Chats", "Suas criações aparecerão aqui") ou redundante (Automações repete título+CTA num sub-painel **E** num canvas vazio = dois empty-states empilhados). Veredito: **a lista-do-meio não se justifica como fixo permanente** — fica morta 90% do tempo e duplica o canvas nos outros 10%.

**Modelo espacial novo — DUAS superfícies, nunca três:**
1. **Régua de navegação** à esquerda (ícone-only ~64–72px; rótulo no hover/pin). Active = plate navy + marcador terracota 3px + ícone preenchido (hoje **não existe** active state — um tell de LibreChat). **Sem subtítulos de 2 linhas** ("Seu histórico de conversas", "Gerar imagens de produto com I…" são ruído).
2. **Palco único** (canvas creme full-bleed).
3. **Gaveta "Atelier"** na borda direita, sob demanda, **idêntica nas 5 ferramentas** — histórico/criações/runs/agentes vivem aqui, não numa coluna permanente. Fechada por padrão; o palco respira.

### Nav (5 itens, PT-BR fonte de verdade)
`Conversar · Estúdio · Agentes · Fluxos · Automações` — verbos-de-intenção. `Flows→Fluxos`, `My Agents→Meus agentes`, `Please select an Agent→` auto-seleciona agente padrão (Azzas Geral) para o composer nunca travar.

### Empty vs Populado
Todo zero-state vira **onboarding editorial full-bleed**: headline Playfair + 1 imagem duotone + 1 CTA navy + 3 chips de exemplo. **Nunca** caixa tracejada com "aparecerão aqui". Populado preenche o mesmo palco com **skeletons primeiro** (shimmer creme), nunca flash de vazio. Automações empty colapsa o título duplicado para uma linha Playfair "Nada agendado ainda" + 1 CTA.

### Remover vazamento de infra
`Uso de hoje 0%` (balance widget) e `Renova hoje 00:00 (em 15h)` saem do chrome → vão para Configurações > Uso. O pé da régua tem só o avatar. Footer "Azzas 2154 — Fashion & Lifestyle" é **promovido** de nota-de-rodapé órfã para tagline Playfair-itálica sob o logo.

### Idioma
PT-BR forçado como default; nomes de endpoint/modelo movidos para i18n para não vazar inglês da camada de dados. Auth SSO-first: "Entrar com Microsoft" é o botão navy primário; e-mail/senha colapsam sob "ou usar e-mail".

---

## 6. Modelo de Interação

- **Composer é o protagonista** (e vive em toda superfície, não só no chat). Card paper branco sobre creme, 760px, 14px raio, o **único elemento elevado**. Hoje ele é uma caixa fina e inerte menor que a saudação, dizendo "Please select an Agent" — hierarquia invertida.
- **Agente pré-selecionado, inline:** chip navy "para [Agente ▾]" no topo-esquerdo do composer, padrão já escolhido (mata o dead-state "Please select an Agent"). O chip abre um popover de agentes como **foto-cards**, não lista. Modelo vai para um "⋯ Avançado".
- **Ferramentas-como-modos:** sob o composer, 3-4 chips de ponto-de-partida (creme, hairline, NÃO navy): "Variantes de cor", "Produto em modelo", "Resumir briefing", "Agendar fluxo" — apertar um roteia o mesmo composer para a ferramenta. Estúdio/Fluxos viram **modos da conversa**, não apps vazios separados.
- **Send = a única ação navy**, escurece no primeiro keystroke (hierarquia sentida).
- **Confirmação inline** (sem window.confirm): a linha vira "Excluir? [Excluir] [Cancelar]" no lugar. **Ações de linha sempre visíveis** (não hover-only), text-buttons steel à direita.
- **Account menu** abre pra cima do avatar, popover creme: Configurações, Tema, Sair (PT-BR). Sem balance bar.

---

## 7. Signature moves (o que torna inconfundível Azzas + premium)
1. **Creme como clima, paper como conteúdo:** o app inteiro sobre #F9F6EA, cards brancos flutuando em hairlines quentes — nenhuma superfície é branco puro, nenhuma borda é cinza. Isso sozinho separa de todo SaaS branco e do LibreChat.
2. **Playfair como a voz que se dirige a você:** a saudação "Bom sábado, Artur." em Playfair 36px sobre controles Red Hat — contraste masthead/corpo de revista de moda, nunca de dashboard.
3. **Fotografia de produto como material:** num produto de geração de imagem, a imagem **é** a interface. Resultados, agentes e trabalho-recente carregam crops editoriais 4:5.
4. **Uma ação navy, uma faísca terracota:** navy é o único fill; terracota racionada só para status "live" e marcador de nav ativa — disciplina total no lugar da anarquia atual.
5. **Modelo de palco único + gaveta Atelier:** uma régua + um palco editorial + uma gaveta sob demanda em toda tela — a coluna-do-meio morta some para sempre.

---

## 8. Tela-herói (chat-home redesenhada) — spec de mockup

Full-bleed creme. **RÉGUA** (esq, ~64–72px, paper-white com hairline quente à direita — NÃO faixa navy): topo, wordmark AZZAS navy + tagline Playfair-itálica "Fashion & Lifestyle" steel logo abaixo. Gap 32px. Nav em rótulos Red Hat 14 single-line com ícones-linha steel 20px: **Conversar** (ativo — marcador terracota 3px, plate creme, ícone preenchido), Estúdio, Agentes, Fluxos, Automações. Sem subtítulos, sem barra de uso. Pé: avatar AL terracota + "Artur Lemos" (popover pra cima). **A coluna "Chats" sumiu.**

**PALCO:** canvas creme, com um duotone navy-sobre-creme de campanha Azzas a ~8% ancorado no terço inferior (o vazio vira espaço de marca). Coluna central 760px. Levemente acima do meio: a saudação em **Playfair Display 36/44 peso 500, navy** — "Bom sábado, Artur." (PT-BR, ciente da hora, só primeiro nome, sem ícone de robô). 12px abaixo, linha steel Red Hat 15: "Para onde vamos hoje?". 40px de ar, então **O COMPOSER como herói:** card paper 760px, 14px raio, hairline + sombra suave. Topo-esquerdo: chip "para Estúdio de Imagens ▾" (agente padrão auto-selecionado). Placeholder Red Hat 15 steel: "Descreva uma peça, peça uma variante de cor, ou comece uma conversa…". Baseline inferior: paperclip steel à esq; botão send navy (o único fill) à dir, anel terracota acende ao digitar. Sob o composer, 3-4 chips de ponto-de-partida (creme, hairline). 48px abaixo: seção editorial "Retome de onde parou" (label Playfair-itálico 18 + hairline) → grid 3-up (gutter 32px) de cards de trabalho-recente com crop 4:5, título Playfair 16, timestamp Red Hat 12, ações steel sempre visíveis (Abrir · Duplicar). Em conta nova, o grid vira **uma faixa de campanha Azzas full-bleed** (40% altura) com linha Playfair "Sua primeira criação começa aqui." — zero-state desenhado, nunca caixa tracejada.

A tela toda lê como capa de revista: masthead-régua, headline Playfair, um input confiante, e um grid editorial de trabalho — quente, quieto, inconfundivelmente Azzas, impossível de confundir com LibreChat ou ChatGPT.

---

## 9. Roadmap → cards Linear (priorizado)

> Ordem pensada para que os **primeiros P0** virem a percepção de "LibreChat com faixa navy" → "produto Azzas premium". P0 = transformador; P3 = polish.

### P0 — Esqueleto (o que muda a cara)
- **P0-A · Matar o shell master-detail.** Remover a coluna-do-meio permanente em Chat/Studio/Agentes/Flows/Automações; introduzir o modelo régua + palco + gaveta "Atelier" sob demanda. Empty-states full-bleed (sem caixa tracejada), skeletons no load. → `components/UnifiedSidebar`, `components/Chat`, `components/Studio`, `components/Automacoes`, `routes/Dashboard.tsx` · *interativo aqui (shape) + agente (mecânica)*
- **P0-B · Clima creme + uma cor primária.** `--canvas:#F9F6EA` no corpo inteiro; navy como único fill; deletar purple/green/black; mover infra (balance/"Renova hoje") para Configurações. → `client/src/style.css`, `tailwind.config.cjs`, `components/Nav/BalanceWidget`, `components/Auth` · *agente (colorize sistemático)*
- **P0-C · PT-BR fonte de verdade.** Espelhar chaves EN→pt-BR, mover nomes de endpoint/modelo para i18n, forçar default pt-BR, purgar "Happy weekend/Please select an Agent/My Agents/Welcome back/Settings/Log out/Flows". → `client/src/locales/pt-BR`, data-provider · *agente (clarify)*
- **P0-D · Playfair como voz.** Aplicar Playfair em saudações/H1/heróis de empty-state/taglines (24–40px); Red Hat em todo o resto. Saudação time-aware "Bom [período], [nome].". → `components/Chat/Landing`, headings globais · *interativo (shape) + agente*

### P1 — Hierarquia e primitivos
- **P1-A · Composer como herói + agente pré-selecionado.** Compositor 760px elevado, chip de agente inline com default, chips de ponto-de-partida (ferramentas-como-modos). Matar "Please select an Agent". → `components/Chat/Input`, `components/Input` · *interativo (shape) + agente*
- **P1-B · Active-nav + régua redesenhada.** Marcador terracota, ícone preenchido no ativo, remover subtítulos de 2 linhas, promover tagline. → `components/UnifiedSidebar/ExpandedPanel`
- **P1-C · Set de ícones custom** (1.5px, vocabulário de moda) substituindo Lucide/robô. → ícones globais
- **P1-D · Confirmação inline + ações de linha sempre visíveis** (sem window.confirm). → listas de Automações/Agentes/Conversas

### P2 — Imagem como material
- **P2-A · Fotografia de produto nos cards** (Studio/Agentes/recentes), crops 4:5. → `components/Studio`, `components/Agentes`
- **P2-B · Duotone editorial nos empty-states/auth** (campanha Azzas ~8%). → empty-states, `components/Auth/AuthLayout`
- **P2-C · Auth SSO-first** ("Entrar com Microsoft" primário navy; e-mail/senha sob disclosure). → `components/Auth`

### P3 — Motion e polish
- **P3-A · Motion material** (reveal de foto, marcador deslizante, dot terracota "gerando", sem spinner/bounce). → global
- **P3-B · Skeletons creme** em todo load. → global

---

## 10. Como executar (próxima sessão)
1. `/clear` (esta sessão está grande; tudo que importa está aqui).
2. Nova sessão: "leia REDESIGN.md do iazzas e vamos criar os cards no Linear (projeto iazzas)".
3. Dividir: **shape** das telas-chave (P0-A, P0-D, P1-A) = interativo aqui; **colorize/clarify/ícones/imagem/motion** = paralelizável por agente. Dependências: P0-A bloqueia o resto do shell; P0-B/C/D em paralelo; P1 depois do P0; P2/P3 por último.
4. Modo babá: monitorar Railway/Linear enquanto agentes executam.
