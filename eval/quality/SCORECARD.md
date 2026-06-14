# Scorecard — Lever Lab (Stage 1)

Baseline = **flash-current** (o que os usuários recebem hoje). Notas 0-10, juiz Claude (Opus), candidatos anonimizados, 10 tarefas.

| Config | Correção | Profund. | Rigor dados | Instr/Formato | Estrutura | **Overall** | Δ vs base | Wins | Dist. p/ ref (igual/perto/médio/longe) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|---|
| flash-current | 7.7 | 6.2 | 6.7 | 9.1 | 7.4 | **6.6** | +0.0 | 0 | 0/2/5/3 |
| flash-plus-tuned | 7.7 | 6.7 | 6.7 | 8.8 | 7.6 | **6.6** | +0.0 | 0 | 0/0/9/1 |
| pro-current | 8.0 | 6.9 | 7.2 | 9.3 | 8.1 | **7.0** | +0.4 | 0 | 0/2/8/0 |
| pro-plus | 8.6 | 8.0 | 7.9 | 9.6 | 8.6 | **7.9** | +1.3 | 3 | 1/5/4/0 |
| pro-plus-tuned | 8.4 | 7.4 | 7.2 | 9.5 | 8.7 | **7.7** | +1.1 | 2 | 2/2/6/0 |
| pro-v2 | 8.3 | 7.7 | 7.3 | 9.4 | 8.8 | **7.5** | +0.9 | 0 | 0/6/4/0 |
| g31pro-v2 | 9.0 | 8.7 | 8.4 | 9.5 | 8.6 | **8.6** | +2.0 | 2 | 3/7/0/0 |
| g31pro-v3 | 8.9 | 8.7 | 8.7 | 9.6 | 8.9 | **8.5** | +1.9 | 0 | 2/8/0/0 |
| g35flash-v3 | 8.8 | 8.7 | 8.7 | 9.7 | 8.9 | **8.5** | +1.9 | 1 | 2/7/1/0 |
| g31pro-v4 | 9.2 | 8.8 | 8.8 | 9.6 | 8.7 | **8.8** | +2.2 | 2 | 3/7/0/0 |

## Leitura por alavanca
- **Troca de modelo (Flash→Pro), prompt atual:** 6.6 → 7.0 (Δ 0.4)
- **Prompt melhorado no Pro:** 7.0 → 7.9 (Δ 0.9)
- **Params calibrados (temp 0.4 / maxOut 32k) no Pro+prompt:** 7.9 → 7.7 (Δ -0.2)
- **Upgrade barato (manter Flash + prompt+params):** 6.6 → 6.6 (Δ 0.0)
- **Tudo (pro-plus-tuned) vs hoje:** 6.6 → 7.7 (Δ 1.1)
