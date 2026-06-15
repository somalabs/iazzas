// Deterministic structural linter for Miro diagram/board tasks.
// The objective half of the ruler (the other half is the Claude panel).
// It reads trajectories captured by run-miro.mjs and scores each against the
// task's `gabarito`, catching the reported bug directly: "did the model build a
// real diagram (diagram_create / layout_create) or dump loose text?".
//
// DSL-specific structure (node/connector counts) lives in analyzeDsl(), the single
// seam to fill once the real Miro DSL grammar is read via layout_get_dsl.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = (p) => resolve(__dirname, p);
const tasks = JSON.parse(readFileSync(here('tasks-miro.json'), 'utf8'));
const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));

const STRUCTURAL_TOOLS = new Set(['diagram_create', 'layout_create']);
const TEXT_DUMP_TOOLS = new Set(['layout_create']); // only a dump if it's ALL text items — see analyzeDsl

// --- DSL parsers, grounded on the real grammars (see miro-dsl-reference.md) ---
// Flowchart DSL: node lines start with "n", connector lines with "c ", cluster
// lines with "cluster". Connector: "c <src> <text> <tgt>" — labeled if <text> != "-".
function parseFlowchart(dsl) {
  const lines = dsl.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const nodes = lines.filter((l) => /^n\d+\s/.test(l));
  const connectors = lines.filter((l) => /^c\s+n\d+\s/.test(l));
  const clusters = lines.filter((l) => /^cluster\s/.test(l));
  const labeled = connectors.filter((l) => {
    const m = l.match(/^c\s+n\d+\s+(.+?)\s+n\d+\s*$/);
    return m && m[1].trim() !== '-';
  });
  return {
    nodes: nodes.length,
    connectors: connectors.length,
    labeledEdges: connectors.length > 0 && labeled.length >= 1,
    groups: clusters.length,
    allText: false,
  };
}

// Layout DSL: one item per line "id TYPE ...". Count item types; a board that is
// ALL TEXT items is the "loose text" failure mode. Frames are the grouping unit.
function parseLayout(dsl) {
  const lines = dsl.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const TYPES = ['FRAME', 'STICKY', 'SHAPE', 'TEXT', 'CARD', 'DOC', 'TABLE'];
  const items = lines
    .map((l) => l.match(/^\S+\s+([A-Z]+)\b/))
    .filter((m) => m && TYPES.includes(m[1]))
    .map((m) => m[1]);
  const frames = items.filter((t) => t === 'FRAME').length;
  const content = items.filter((t) => t !== 'FRAME' && t !== 'TEXT').length;
  const textOnly = items.length > 0 && items.every((t) => t === 'TEXT');
  return {
    nodes: content || items.length,
    connectors: null,
    labeledEdges: null,
    groups: frames,
    allText: textOnly,
  };
}

function analyzeDsl(dslText, toolName) {
  if (!dslText) return { nodes: null, connectors: null, labeledEdges: null, groups: null, allText: null };
  if (toolName === 'diagram_create') return parseFlowchart(dslText);
  if (toolName === 'layout_create') return parseLayout(dslText);
  return { nodes: null, connectors: null, labeledEdges: null, groups: null, allText: null };
}
// ----------------------------------------------------------------------------

function dslOf(traj, toolName) {
  const call = traj.find((t) => t.tool === toolName);
  if (!call) return '';
  const a = call.args || {};
  return a.diagram_dsl || a.dsl || a.text || a.content || '';
}

function lintOne(row) {
  const task = byId[row.task];
  const g = task.gabarito;
  const seq = row.toolSeq || [];
  const usedStructural = seq.find((t) => STRUCTURAL_TOOLS.has(t));
  const usedExpected = seq.includes(g.tool);
  const dumpedTextOnly = seq.length === 0 || (!usedStructural && (row.finalText || '').length > 0);

  const dsl = usedStructural ? dslOf(row.trajectory || [], usedStructural) : '';
  const parsed = analyzeDsl(dsl, usedStructural);

  const checks = {
    used_structural_tool: !!usedStructural,
    used_expected_tool: usedExpected,
    no_loose_text_dump: !dumpedTextOnly && parsed.allText !== true,
    enough_nodes: parsed.nodes == null ? null : parsed.nodes >= g.min_nodes,
    enough_connectors:
      !g.expects_connectors ? true : parsed.connectors == null ? null : parsed.connectors >= g.min_connectors,
    labeled_edges: !g.labeled_edges ? true : parsed.labeledEdges,
    grouped: !g.grouping ? true : parsed.groups == null ? null : parsed.groups >= 2,
  };

  const scored = Object.values(checks).filter((v) => typeof v === 'boolean');
  const passRate = scored.length ? scored.filter(Boolean).length / scored.length : 0;
  return { task: row.task, config: row.config, toolSeq: seq, checks, passRate };
}

function main() {
  const runs = JSON.parse(readFileSync(here('results-miro/run.json'), 'utf8'));
  const linted = runs.map(lintOne);

  const byConfig = {};
  for (const l of linted) (byConfig[l.config] ??= []).push(l);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  let md = '# Linter estrutural — Miro (metade objetiva da régua)\n\n';
  md += 'Cada tarefa: usou a tool estrutural certa? sem despejo de texto? nós/connectors/rótulos/agrupamento conforme gabarito?\n\n';
  md += '| Config | Tool certa | Sem texto solto | Pass rate médio | Tarefas |\n|---|--:|--:|--:|--:|\n';
  for (const [cfg, ls] of Object.entries(byConfig)) {
    const toolOk = mean(ls.map((l) => (l.checks.used_expected_tool ? 1 : 0)));
    const noDump = mean(ls.map((l) => (l.checks.no_loose_text_dump ? 1 : 0)));
    md += `| ${cfg} | ${(toolOk * 100).toFixed(0)}% | ${(noDump * 100).toFixed(0)}% | ${(mean(ls.map((l) => l.passRate)) * 100).toFixed(0)}% | ${ls.length} |\n`;
  }
  writeFileSync(here('SCORECARD-MIRO-LINT.md'), md);
  writeFileSync(here('results-miro/lint.json'), JSON.stringify(linted, null, 2));
  console.log(md);
}

main();
