# IAzzas — Fechar o gap de qualidade pro "nível Claude" (locked-in no Gemini)

**Data:** 2026-06-13
**Autor:** sessão Claude Code (autônoma, usuário ausente / acompanhando via mobile)
**Status:** design para aprovação assíncrona

---

## 1. Problema

O usuário (time de IA da Azzas) está insatisfeito com a qualidade do output do IAzzas
comparado ao claude.ai. Queixas concretas (multi-select): **raciocínio/profundidade**,
**uso de dados/tools (BigQuery/MCP)** e **consistência**. Exemplo citado: pediu um fluxograma
no Miro e recebeu "três blocos de texto soltos" em vez de um diagrama.

Hipótese inicial do usuário: "o gargalo é o harness". Parcialmente certo — mas o harness
decompõe em alavancas independentes, e a maior delas é o **tier do modelo**.

## 2. Restrição dura

**Travado no Google/Gemini** (custo/contrato/governança). `ANTHROPIC_API_KEY` vazio,
`GOOGLE_KEY` setado. Rotear para Claude está fora de mesa.

Consequência honesta sobre o teto:
- **BI/dados** (estruturado, verificável): dá pra chegar muito perto ou empatar com Claude —
  o gargalo ali é harness (SQL certo + regras de negócio + validação), não QI bruto.
- **Assistente geral aberto**: fecha bastante, mas o tier do modelo deixa diferença residual
  nas tarefas mais difíceis. Meta honesta: **indistinguível em ~80% das tarefas reais**.

> Nota: a restrição é sobre o **produto** (o que os usuários recebem). A **avaliação** pode
> usar Claude como juiz e como "teto de referência" — o juiz não é entregue ao usuário, é
> instrumento de medição.

## 3. Diagnóstico (com evidência)

Config real lida de `librechat.yaml` + `packages/data-provider/src/schemas.ts`:

| Lever | Estado atual | Evidência | Severidade |
|---|---|---|---|
| Tier do modelo | default = `gemini-2.5-flash` | `librechat.yaml:33,52` | 🔴 Alta |
| `temperature` | `1` (default herdado) | `schemas.ts:349` | 🟠 Média (consistência) |
| `maxOutputTokens` | `8192` | `schemas.ts:343` | 🟠 Média (profundidade) |
| System prompt | só persona + `cannot_answer`, sem scaffolding de capacidade | `librechat.yaml:54-83` | 🔴 Alta |
| Orquestração de tools | frágil; sem workflow de ferramenta no prompt | caso Miro | 🟠 Média |
| `thinking` | **já ligado** (dynamic, budget -1) | `schemas.ts:363-373`, `google/llm.ts:154,214-242` | ✅ OK (corrige hipótese inicial) |

**Correção de hipótese:** "ligar o pensamento" não é o gap — thinking dinâmico já está on.
O que limita é o Flash pensar pouco mesmo no modo dinâmico, e os params herdados (temp 1,
maxOut 8k) não calibrados pra análise.

## 4. Alavancas, priorizadas

1. **Default Flash → Pro** (ou roteamento por complexidade). Maior salto.
2. **System prompt: adicionar camada de capacidade** — planejamento explícito, disciplina de
   tool-use (ex.: nos MCPs de BI, chamar `get_context`/`get_business_rules`/`describe_table`
   antes de `consultar_bq`; validar resultado; nunca inventar número), estrutura de análise,
   auto-checagem. Sem perder a persona/idioma atuais.
3. **Calibrar params por tipo de tarefa**: `temperature` ~0.3–0.5 e `maxOutputTokens` ~32k para
   análise; possivelmente forçar `thinkingBudget` alto fixo no Flash quando ele continuar no mix.
4. **Endurecer orquestração de tools**: garantir que as tools certas existem e estão conectadas
   (caso Miro = OAuth não conectado OU Flash usando mal), e ensinar o workflow no prompt.

## 5. Como avaliar (o harness — o coração da entrega)

Princípio: **não dá pra afinar no escuro.** A régua é o mesmo artefato que responde "como avaliar".

### Stage 1 — "Lever Lab" (rápido, isola os maiores levers, sem HTTP/MCP)
Chama a **Gemini API direto** (via `GOOGLE_KEY`) com o **system prompt EXATO do IAzzas**,
variando uma alavanca por vez. Reproduz fielmente a experiência sem-tools (onde o loop de
agente é essencialmente uma chamada única de LLM).

- Matriz de configs: `flash-atual` · `pro-atual` · `pro-prompt+` · `pro-prompt+-temp0.4-maxout32k`.
- Conjunto de tarefas: ~12–15 (raciocínio, escrita/síntese, análise sem-tool, formatação).
- Saída: scorecard mostrando quanto cada lever fecha o gap.

### Stage 2 — "Full Harness" (caminho real: API do iazzas + tools)
Dirige o **chat real do iazzas** via API autenticada (usuário local `evalbot@iazzas.local`
já criado; login retorna JWT). Cobre o que Stage 1 não cobre: loop de agente, tool-calling,
artifacts, e **BI via MCP** — usando `../bq-analista` rodando **local em modo simulado** (sem
SSO), conforme indicado pelo usuário.

### Scoring
- **Rubrica multi-dimensão** (0–10 por dimensão): correção/veracidade, profundidade de
  raciocínio, uso correto de dados/tools, seguir instruções, estrutura/legibilidade, consistência.
- **Claude-as-judge** (multi-lente / adversarial nas dúvidas), não vibe-check.
- **Head-to-head vs teto de referência**: para cada tarefa, gerar uma resposta "nível Claude"
  de referência e medir distância iazzas→referência.
- **Verificação dura no BI**: número citado tem que bater com a query/fonte (a `analyst
  principles.md` do bq-analista já define os 4 tiers de dado — usar como gabarito).
- **Spot-check humano** do usuário em uma amostra (calibra o juiz).

### Métricas de sucesso
- Score médio por dimensão por config; delta vs baseline Flash-atual.
- % de tarefas onde iazzas-tuned fica "indistinguível" da referência (juiz cego ≥ limiar).
- BI: % de números corretos / sem alucinação.
- Regressões: nenhuma dimensão cai vs baseline.

## 6. Rollout (só após aprovação)
Mudar `librechat.yaml` (e params) **uma alavanca por vez**, re-rodando o harness a cada mudança
para atribuir o delta. Ordem = seção 4. Nada de mudar tudo de uma vez (impossível atribuir causa).

## 7. Riscos
- **Custo**: Pro como default sobe custo/latência. Mitigar com roteamento por complexidade.
- **bq-analista local**: precisa subir em modo simulado sem SSO — a investigar como ativar.
- **Fidelidade Stage 1**: não captura o loop de agente p/ tarefas com tool — por isso Stage 2.
- **Juiz Claude vs produto Gemini**: ok para medição; documentar para não confundir com o produto.

## 8. Estado / setup já adiantado
- Stack iazzas inteira rodando (Docker): LibreChat:3080, Mongo, RAG, Meilisearch, code-gateway.
- Imagem do container = `iazzas-redesign:local` (é o fork, não upstream).
- Usuário local de eval criado: `evalbot@iazzas.local` (login via API retorna JWT). ✅
- `ALLOW_EMAIL_LOGIN=true`, `ALLOW_REGISTRATION=true` → autenticação autônoma OK.
- Bloqueio de BI (SSO/allowlist) contornável via `../bq-analista` local simulado.
