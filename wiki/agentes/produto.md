# Agente de Produto — Memória de Longo Prazo

> Atualizado em: 2026-05-16
> Escopo: fork LibreChat para Azzas 2154 (varejo de moda, multimarca: Farm, Animale, Cris Barros, etc.)
> Produto central desta fase: **Studio** — tela de geração de imagens de moda

---

## Domínio: Studio de Geração de Imagens

### O que é o Studio

Interface de geração de imagens de moda construída sobre o fork do LibreChat. Não é um UI genérico
de IA — a proposta de valor está na **camada de prompt orchestration especializada em moda**,
não nos pesos dos modelos. "A inteligência de moda vive nos templates de prompt."

Sem templates de UC bem especificados, o Studio vira "mais um gerador de imagens genérico" —
risco explícito reconhecido pelo produto (e pelo próprio PRD).

### Produto de referência

O time já usa ativamente a plataforma Freepik (AI Image Generator), com modelos Nano Banana 2
e Nano Banana Pro. Os prompts são escritos em PT-BR com referências @img1..@imgN. O Studio
é a versão **guiada** desse fluxo: estrutura o que hoje é prompt livre em UCs tipados com form
fields, e constrói o prompt automaticamente. Isso reduz curva de aprendizado e aumenta consistência.

### Casos de Uso v1 (ratificados por Artur — LEM-20/LEM-22)

Os 5 UCs canônicos da v1, armazenados como YAML em `config/studio/usecases/`:

| ID | Nome PT | Arquivo | Modelo default |
|----|---------|---------|----------------|
| `color_variants` | Variantes de cor de um produto | `01-color-variants.yaml` | `flux-kontext` |
| `pattern_application` | Aplicar estampa em produto | `02-pattern-application.yaml` | `nano-banana-2` (Pro via router) |
| `virtual_tryon` | Produto em modelo (virtual try-on) | `03-virtual-tryon.yaml` | `nano-banana-pro` |
| `multi_reference` | Criação a partir de múltiplas referências | `04-multi-reference.yaml` | `nano-banana-pro` |
| `sketch_to_render` | Sketch-to-render | `05-sketch-to-render.yaml` | `nano-banana-pro` |

**Nota crítica para código**: Os `UseCase` types hardcoded em `client/src/components/Studio/types.ts`
(linha 15: `'product' | 'editorial' | 'lookbook' | 'lifestyle' | 'flatlay' | 'advanced'`) são
placeholder de uma implementação anterior — **devem ser substituídos pelos 5 UCs v1 acima**.
O tech stream (LEM-18 ou issue subsequente) precisa refatorar os tipos e os componentes `UCSelector`
e `UCForm` para consumir os YAML canônicos.

### Estrutura dos Templates YAML

Cada UC tem:
- `use_case`: ID snake_case
- `version`: semver (começar em `1.0.0`)
- `default_model` + `fallback_model`: IDs de modelo (confirmados — ver tabela abaixo)
- `ui_defaults`: `aspect_ratio`, `image_count` (4 = exploração, 1 = refinamento), `resolution`
- `image_slots`: slots de imagem tipados que o usuário fornece (required/optional, multiple/max_count)
- `form_fields`: campos de texto/select/toggle/boolean do formulário guiado
- `prompt_template`: template Handlebars-style em inglês com `{{placeholders}}` e `{{#if}}`
- `post_processing`: `upscale_if_below: 2048`, `apply_watermark: c2pa`
- `quality_signals`: sinais de QA automatizado por UC
- `compliance.requires_human_review`: obrigatório para UC3 e UC4

### Defaults por UC

| UC | Aspect Ratio | Imagens Default | Justificativa |
|----|-------------|-----------------|---------------|
| color_variants | 4:5 | 4 | Still e-commerce; exploração |
| pattern_application | 4:5 | 4 | Still e-commerce |
| virtual_tryon | 2:3 | 4 | Portrait/modelo |
| multi_reference | 4:5 | 4 | E-commerce default; editorial pode overridar |
| sketch_to_render | 4:5 | 4 | E-commerce; designer pode preferir 2:3 |

Refinamento (1 imagem) é configurável pelo usuário — não é default da v1.
Resolução default: **2K** para todos os UCs.

### Modelos (confirmados pelo PRD — LEM-22, 2026-05-16)

| ID | Nome | Uso |
|----|------|-----|
| `flux-kontext` | Flux Kontext | UC1: edição local rápida de colorway |
| `nano-banana-2` | Google Nano Banana 2 | UC2 default: volume/batch; fallback de UC3/4/5 |
| `nano-banana-pro` | Google Nano Banana Pro | UC2 via router, UC3, UC4, UC5: alta fidelidade |

**UC2 tem roteamento dinâmico**: default `nano-banana-2`; router faz upgrade para `nano-banana-pro`
se `intensity == full OR scale == extra-large`.

**UC3 (virtual try-on) nota**: se houver serviço dedicado de try-on no stack
(IDM-VTON, OOTDiffusion), deve ser preferido sobre nano-banana-pro. Tech stream deve avaliar
durante implementação — nota registrada no YAML.

---

## Vocabulário Técnico de Moda (usado nos prompts)

Termos que aparecem nos templates e devem ser preservados em inglês:

- **Silhouette** — forma geral e volume da peça
- **Drape** — como o tecido cai e se comporta com gravidade
- **Colorway** — combinação de cores de uma peça (ex: dusty rose / cobalt blue)
- **All-over print** — estampa que cobre toda a superfície
- **Placement print** — motivo único posicionado estrategicamente
- **Panel print** — estampa limitada a painéis do molde
- **Engineered print** — estampa projetada especificamente para o molde da peça
- **Flat lay** — produto fotografado deitado
- **Ghost mannequin** — manequim invisível (edição que remove o manequim da foto)
- **Specular highlights** — reflexos especulares (brilho direcional — importante para seda/couro)
- **Boucle** — tecido com superfície texturizada e irregular
- **Ripstop** — tecido técnico com grade de reforço visível
- **C2PA** — Content Credentials (padrão de proveniência para imagens geradas por IA)

---

## Decisões de Produto Ratificadas

### v1 (LEM-20/LEM-22 — 2026-05-16)
- **5 UCs canônicos confirmados por Artur** (LEM-20 §7.1): color_variants, pattern_application, virtual_tryon, multi_reference, sketch_to_render.
- **Localização dos templates**: `config/studio/usecases/` — YAML versionado, não hardcoded em TypeScript.
- **Idioma dos prompts**: inglês (modelos respondem melhor; vocabulário técnico de moda em inglês).
- **Post-processing obrigatório para todos os UCs**: upscale mínimo 2048px + C2PA watermark.
- **Compliance**: revisão humana obrigatória antes de uso comercial para UC3 e UC4.
- **Refinamento**: 1 imagem (non-default) — exploração padrão é 4.
- **Resolução default**: 2K para todos os UCs.
- **Artefatos criados (LEM-22, 2026-05-16)**:
  - 5 YAMLs em `config/studio/usecases/` (templates + form schemas + defaults)
  - `config/studio/router.yaml` (lógica do Model Router)
  - `config/studio/CONTRACT.md` (contrato design+tech)

### Pendências resolvidas
- ~~Model IDs pendentes~~ — **confirmados** contra PRD §2.2: Flux Kontext, Nano Banana 2, Nano Banana Pro.

### Pendências abertas
- **UC3 (virtual try-on)**: tech stream deve avaliar se há serviço dedicado (IDM-VTON, OOTDiffusion) antes de usar nano-banana-pro.

---

## Raciocínios Recorrentes do Produto

- **Valor está no template, não no modelo**: A troca de modelo é cirúrgica (1 linha no YAML). A qualidade dos prompts e o schema do formulário é onde o produto ganha ou perde. Priorizar qualidade dos templates.
- **Não inventar compliance além do PRD**: watermark C2PA e revisão humana obrigatória já estão no PRD. Não criar restrições adicionais sem base.
- **UC como "unidade fundamental"**: cada UC mapeia a um workflow completo com form schema, routing, prompt e QA. Não misturar UCs ou criar "modo avançado" que contorna os templates.
- **O Studio é a versão guiada do Freepik**: o time já usa Freepik com @img1..N e prompts livres. O Studio estrutura isso em UCs tipados. A intuição de produto sempre parte do que o time já faz na ferramenta de referência.

---

## Estrutura de Arquivos Relevante

```
/repos/iazzas/
├── config/studio/                   # Fonte única de verdade dos UCs
│   ├── CONTRACT.md                  # Contrato design+tech
│   ├── router.yaml                  # Lógica do Model Router
│   └── usecases/
│       ├── 01-color-variants.yaml
│       ├── 02-pattern-application.yaml
│       ├── 03-virtual-tryon.yaml
│       ├── 04-multi-reference.yaml
│       └── 05-sketch-to-render.yaml
├── client/src/components/Studio/    # UI do Studio (componentes React — ainda não criados na branch)
│   ├── types.ts                     # ATENÇÃO: UseCase type é placeholder — substituir pelos 5 UCs v1
│   └── sidebar/
│       ├── UCSelector.tsx           # Seletor de UC (precisa refatorar para consumir YAMLs)
│       └── UCForm.tsx               # Form do UC (precisa suporte a image_slots)
└── wiki/agentes/produto.md          # Este arquivo
```
