# Identidade visual Azzas no output do iazzas — Design

- **Data:** 2026-06-18
- **Branch:** `iazzas/identidade-visual`
- **Status:** design aprovado (brainstorming)

## Problema

Existe um guia de identidade visual da BU Fashion & Lifestyle (Azzas 2154) — paleta restrita (navy + neutros quentes), tipografia (Red Hat Display + Playfair Display), tokens CSS e componentes. Hoje ele é um `.md` solto no repo, sem nenhuma ligação com o que o iazzas efetivamente produz. Queremos que qualquer material gerado pelo iazzas (relatório/deck HTML, gráficos, diagrama no Miro) saia com essa identidade por padrão.

## Decisões

1. **Escopo de marca:** somente a identidade institucional Azzas 2154. Sem registry por marca (FARM, Animale, etc.) nesta etapa.
2. **Canais cobertos:** HTML (reports/decks/one-pagers/dashboards), gráficos de dados inline e diagramas/fluxos no Miro. **Moodboard fica de fora** (vive das fotos de produto).
3. **Abordagem:** arquivo no repo como fonte de verdade humana + bloco condensado vivendo no `librechat.yaml` como mecanismo de runtime.

## Por que o bloco precisa viver no prompt

Os artifacts HTML são **escritos pelo próprio modelo** na hora da resposta — não passam pelo code interpreter. Logo, o modelo só aplica o que está no contexto dele. Um arquivo no repo ou bind-mountado no code-gateway **não** alcança um HTML que o modelo escreve direto. Por isso os tokens e regras essenciais têm que estar no `promptPrefix`. O arquivo do repo serve de fonte de verdade para humanos e de referência completa (CSS verbatim), não de mecanismo de runtime.

## Pontos de injeção (`librechat.yaml` em `main`)

- `promptPrefix` do preset **iazzas-flash** — seção "Como entregar um HTML excelente", após o bullet "Design coeso e profissional".
- `promptPrefix` do preset **iazzas-pro** — mesma seção, mesmo ponto (bloco duplicado; inserção idêntica via `replace_all`).
- `serverInstructions` do MCP **Miro** — uma linha na seção de diagrama, junto à regra de "paleta que você declarou".

## O bloco condensado (HTML + charts)

Inserido nos dois presets, indentação de 10 espaços (alinhado aos bullets existentes):

- Paleta restrita (preto/branco/azuis/neutros quentes; sem cor vibrante) com os ~13 tokens hex.
- Fontes Red Hat Display + Playfair Display via um `<link>` Google Fonts; fallback Arial/Georgia.
- Hierarquia por peso (300/400/600), ALL CAPS só em label/eyebrow, no máx. 2 fontes.
- Navy como acento, powder blue para fundos suaves, overlay ~35% sobre foto, minimalismo.
- Gráficos herdam a paleta (navy/steel/azuis como séries).
- Tabela de fundos de slide (capa/conteúdo/destaque/métricas).

O CSS de componente (card/tag/navbar) **não** vai pro prompt — o modelo deriva dos tokens; o verbatim fica no doc do repo.

## Miro (diagramas/fluxos)

Uma linha em `serverInstructions`: em diagrama/fluxo/matriz institucional, declarar por padrão a paleta Azzas (navy `#274566`, steel `#3D5A73`, neutros), mantendo-a restrita. Explicitamente **não se aplica a moodboard**.

## Fora de escopo (YAGNI)

- Identidades por marca (FARM/Animale/Cris Barros…).
- Tooling de auto-sync entre o doc do repo e o bloco do prompt — a sincronia é manual, sinalizada por um cabeçalho no doc e por nota no spec.
- Moodboards.

## Manutenção / sync

`docs/identidade-visual-azzas.md` é a fonte de verdade. O bloco no `librechat.yaml` é a cópia condensada de runtime. Alterou um, revise o outro. Sinalizado por um cabeçalho de "fonte de verdade" no próprio doc.

## Validação & deploy

- `librechat.yaml` precisa parsear (mesmo gate do PR do waldemiro).
- Smoke test: pedir um deck ao iazzas e conferir paleta/fontes aplicadas.
- Opcional: A/B no harness `eval/quality/` para número antes/depois.
- `librechat.yaml` é volume-mounted em produção → deploy é `git pull` + recreate do `api`, **sem rebuild de imagem**.

## Risco conhecido

As fontes vêm de CDN (Google Fonts). Se o sandbox de artifact bloquear CDN, cai no fallback Arial/Georgia — perde a tipografia, mantém a paleta. O módulo HTML atual já assume "uma fonte via CDN", então não há dependência nova.
