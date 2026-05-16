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

### Casos de Uso v1 (ratificados por Artur — LEM-20)

Os 5 UCs canônicos da v1, armazenados como YAML em `config/studio/usecases/`:

| ID | Nome PT | Arquivo |
|----|---------|---------|
| `color_variants` | Variantes de cor de um produto | `01-color-variants.yaml` |
| `pattern_application` | Aplicar estampa em produto | `02-pattern-application.yaml` |
| `virtual_tryon` | Produto em modelo (virtual try-on) | `03-virtual-tryon.yaml` |
| `multi_reference` | Criação a partir de múltiplas referências | `04-multi-reference.yaml` |
| `sketch_to_render` | Sketch-to-render | `05-sketch-to-render.yaml` |

**Nota crítica para código**: Os `UseCase` types hardcoded em `client/src/components/Studio/types.ts`
(linha 15: `'product' | 'editorial' | 'lookbook' | 'lifestyle' | 'flatlay' | 'advanced'`) são
placeholder de uma implementação anterior — **devem ser substituídos pelos 5 UCs v1 acima**.
O tech stream (LEM-18 ou issue subsequente) precisa refatorar os tipos e os componentes `UCSelector`
e `UCForm` para consumir os YAML canônicos.

### Estrutura dos Templates YAML

Cada UC tem:
- `use_case`: ID snake_case
- `version`: semver (começar em `1.0.0`)
- `default_model` + `fallback_model`: IDs de modelo (**pendentes de confirmação contra PRD §2.2**)
- `ui_defaults`: `aspect_ratio` e `image_count`
- `image_slots`: slots de imagem que o usuário fornece (required/optional)
- `form_fields`: campos de texto/select do formulário guiado
- `prompt_template`: template Handlebars-style em inglês com `{{placeholders}}` e `{{#if}}`
- `post_processing`: `upscale_if_below: 2048`, `apply_watermark: c2pa`
- `quality_signals`: sinais de QA automatizado por UC

### Defaults por UC

| UC | Aspect Ratio | Imagens Default | Justificativa |
|----|-------------|-----------------|---------------|
| color_variants | 4:5 | 4 | Still e-commerce — PRD §4.1-F4; exploração |
| pattern_application | 4:5 | 4 | Still e-commerce |
| virtual_tryon | 2:3 | 4 | Portrait/modelo — PRD §4.1-F4 |
| multi_reference | 4:5 | 4 | E-commerce default; override para editorial |
| sketch_to_render | 4:5 | 4 | E-commerce; designer pode preferir 2:3 |

Refinamento (1 imagem) é configurável pelo usuário — não é default da v1.

### Modelos (working assumptions — confirmar com PRD §2.2)

| UC | Default (WA) | Fallback | Capability Required |
|----|-------------|----------|---------------------|
| color_variants | flux-1.1-pro | stable-diffusion-3-5-large | img2img, color fidelity |
| pattern_application | flux-fill-pro | flux-1.1-pro | Inpainting/surface mapping |
| virtual_tryon | flux-kontext-pro | flux-1.1-pro | Structural control + garment fidelity |
| multi_reference | flux-redux-pro | flux-1.1-pro | Multi-image conditioning |
| sketch_to_render | flux-canny-pro | flux-1.1-pro | ControlNet/edge conditioning |

**UC3 (virtual_tryon) tem nota especial**: se houver serviço dedicado de try-on no stack
(IDM-VTON, OOTDiffusion), deve ser preferido sobre geração genérica. Tech stream deve avaliar.

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
- **Warp-and-weft** — trama e urdume (estrutura do tecido tecido)
- **Specular highlights** — reflexos especulares (brilho direcional — importante para seda/couro)
- **Boucle** — tecido com superfície texturizada e irregular
- **Ripstop** — tecido técnico com grade de reforço visível
- **C2PA** — Content Credentials (padrão de proveniência para imagens geradas por IA)

---

## Decisões de Produto Ratificadas

### v1 (LEM-20 — 2026-05-16)
- **5 UCs canônicos confirmados por Artur** (LEM-20 §7.1): color_variants, pattern_application, virtual_tryon, multi_reference, sketch_to_render.
- **Localização dos templates**: `config/studio/usecases/` — YAML versionado, não hardcoded em TypeScript.
- **Idioma dos prompts**: inglês (modelos respondem melhor; vocabulário técnico de moda em inglês).
- **Post-processing obrigatório para todos os UCs**: upscale mínimo 2048px + C2PA watermark.
- **Compliance**: revisão humana obrigatória antes de uso comercial (especialmente UC3 e UC4).
- **Refinamento**: 1 imagem (non-default) — exploração padrão é 4.
- **Artefatos criados**: 5 YAMLs em `config/studio/usecases/` (LEM-20, 2026-05-16).

### Pendências (bloqueios não resolvidos)
- **Model IDs**: `default_model` e `fallback_model` de cada UC dependem de confirmação contra PRD §2.2. Working assumptions usadas nos templates (família Flux) — **tech stream deve validar**.
- **UC3 (virtual try-on)**: avaliar se há serviço dedicado de try-on no stack antes de usar modelo de uso geral.

---

## Raciocínios Recorrentes do Produto

- **Valor está no template, não no modelo**: A troca de modelo é cirúrgica (1 linha no YAML). A qualidade dos prompts e o schema do formulário é onde o produto ganha ou perde. Priorizar qualidade dos templates.
- **Não inventar compliance além do PRD**: watermark C2PA e revisão humana obrigatória já estão no PRD. Não criar restrições adicionais sem base.
- **UC como "unidade fundamental"**: cada UC mapeia a um workflow completo com form schema, routing, prompt e QA. Não misturar UCs ou criar "modo avançado" que contorna os templates.

---

## Estrutura de Arquivos Relevante

```
/repos/iazzas/
├── config/studio/usecases/          # Templates YAML dos 5 UCs v1
│   ├── 01-color-variants.yaml
│   ├── 02-pattern-application.yaml
│   ├── 03-virtual-tryon.yaml
│   ├── 04-multi-reference.yaml
│   └── 05-sketch-to-render.yaml
├── client/src/components/Studio/    # UI do Studio (componentes React)
│   ├── types.ts                     # ATENÇÃO: UseCase type é placeholder — substituir pelos 5 UCs v1
│   └── sidebar/
│       ├── UCSelector.tsx           # Seletor de UC (hardcoded, precisa refatorar)
│       └── UCForm.tsx               # Form do UC (precisa suporte a image_slots)
└── wiki/agentes/produto.md          # Este arquivo
```
