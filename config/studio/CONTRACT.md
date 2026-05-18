# Studio Use Cases — Contract

> Source of truth for design and tech streams. Do not duplicate — reference these files directly.

## File Structure

```
config/studio/
├── usecases/
│   ├── 01-color-variants.yaml      # UC1 — Variantes de Cor
│   ├── 02-pattern-application.yaml # UC2 — Aplicar Estampa
│   ├── 03-virtual-tryon.yaml       # UC3 — Produto em Modelo
│   ├── 04-multi-reference.yaml     # UC4 — Múltiplas Referências
│   └── 05-sketch-to-render.yaml    # UC5 — Sketch-to-Render
├── router.yaml                     # Model routing rules
└── CONTRACT.md                     # This file
```

## UC YAML Schema

| Field | Purpose | Consumer |
|---|---|---|
| `image_slots` | Typed upload slots: id, label, required, accepts, max_size_mb, multiple/max_count | Design (renders slots UI), Tech (validates uploads) |
| `form_fields` | Typed form fields: id, type (text/select/toggle/boolean), label, options, defaults | Design (renders form), Tech (validates input) |
| `default_model` + `fallback_model` | Model routing anchors | Tech (router) |
| `ui_defaults` | Pre-selected aspect_ratio, image_count, resolution | Design (initializes controls) |
| `prompt_template` | Handlebars-style template in English | Tech (prompt builder) |
| `post_processing` | Upscale + watermark rules | Tech (output pipeline) |
| `quality_signals` | Automated QA checks per UC | Tech (QA service) |
| `compliance.requires_human_review` | Gate flag (UC3, UC4 = true) | Design (shows review gate), Tech (blocks auto-publish) |
| `router_overrides` | UC-level override rules (used by router.yaml) | Tech (router, UC2 only) |

## Prompt Builder — Implementation Contract

1. Collect `image_slots` inputs → assign `@img1`, `@img2`, ... in slot declaration order (required slots first, then optional).
2. Collect `form_fields` values → build template context object keyed by `field.id`.
3. Render `prompt_template` with context: `{{field_id}}` substitutes value; `{{#if field_id}}...{{/if}}` conditional block; `{{field_id | "default"}}` uses fallback string.
4. Submit rendered prompt + image refs to the resolved model.

## Model Router — Implementation Contract

1. Start with `use_case.default_model`.
2. Evaluate `config/studio/router.yaml` rules in priority order — first match overrides.
3. Evaluate UC-local `router_overrides` if present (UC2 only today).
4. On generation error matching `fallback.on_error`, retry once with `use_case.fallback_model`.

## Versioning

Each UC YAML is independently versioned (semver). Breaking changes (field renames, removed slots) require minor or major bump. Additive changes (new optional fields) are patch bumps. router.yaml has its own version.

## Model IDs

| ID | Name |
|---|---|
| `flux-kontext` | Flux Kontext |
| `nano-banana-2` | Google Nano Banana 2 |
| `nano-banana-pro` | Google Nano Banana Pro |
