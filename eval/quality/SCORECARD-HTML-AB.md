# Scorecard — relatórios/apresentações HTML (prod-current vs prod-html)

Painel cego A/B, juízes Claude veem o PNG renderizado. prod-current = prompt de prod (com a recusa de "gerar arquivo"). prod-html = prod + carve-out (libera HTML via artifact) + módulo de qualidade HTML. Mesmo modelo (3.1 Pro).

| Config | Entregou HTML | Design | Conteúdo | **Nota global** |
|---|--:|--:|--:|--:|
| prod-current | 75% | 5.06 | 5.46 | **5.34** |
| prod-html | 100% | 8.77 | 8.79 | **8.76** |

**Vencedor (prod-html / empate / prod-current):** 24 / 0 / 0

## Por tipo (nota global)

| Tipo | prod-current | prod-html | Δ |
|---|--:|--:|--:|
| report | 6.85 | 8.81 | +1.96 |
| presentation | 3.83 | 8.71 | +4.88 |
