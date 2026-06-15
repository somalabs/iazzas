// Spreadsheet import for the Waldemiro flow. Reads a user-filled product sheet
// (.xlsx/.xls/.csv) in the standard template format and returns the product list
// that gen.mjs consumes. Also writes the standard template the user fills in.
//
// Standard columns (header row, case/accent-insensitive):
//   PRODUTO (obrigatório) | COR | TEXTO | LINHA | COLUNA | POST_IT | INDICADORES
import xlsx from 'xlsx';
import { writeFileSync, readFileSync } from 'node:fs';

const norm = (s) =>
  String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

const COLUMN_ALIASES = {
  prod: ['produto', 'ref', 'referencia', 'prod'],
  cor: ['cor', 'color'],
  texto: ['texto', 'descricao', 'desc', 'nome', 'titulo'],
  linha: ['linha', 'row', 'grupo', 'categoria'],
  coluna: ['coluna', 'col', 'colecao', 'colecho'],
  postit: ['postit', 'post', 'tag', 'marcador'],
  indicadores: ['indicadores', 'indicador', 'kpis', 'metricas'],
};

function resolveHeader(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    const n = norm(h);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(n)) map[field] = i;
    }
  });
  if (map.prod === undefined) {
    throw new Error('Planilha inválida: coluna PRODUTO não encontrada. Use a planilha-padrão (modelo-waldemiro).');
  }
  return map;
}

// Parse a sheet file into the product list gen.mjs expects.
export function readSheet(path) {
  const wb = xlsx.read(readFileSync(path), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  if (!rows.length) return [];
  const map = resolveHeader(rows[0]);
  const cell = (row, field) => (map[field] === undefined ? '' : String(row[map[field]] ?? '').trim());
  return rows
    .slice(1)
    .filter((r) => cell(r, 'prod'))
    .map((r) => ({
      prod: cell(r, 'prod'),
      cor: cell(r, 'cor'),
      texto: cell(r, 'texto'),
      linha: cell(r, 'linha'),
      coluna: cell(r, 'coluna'),
      postit: cell(r, 'postit'),
      indicadores: cell(r, 'indicadores'),
    }));
}

// Write the standard template the user fills in (.xlsx with header + example rows).
export function writeTemplate(path) {
  const header = ['PRODUTO', 'COR', 'TEXTO', 'LINHA', 'COLUNA', 'POST_IT', 'INDICADORES'];
  const examples = [
    ['347544', '52981', 'Vestido Midi Bosque Chic', 'Vestidos', 'Verão 26', 'TOP', '5.190 un · R$ 1,3M'],
    ['349258', '53657', 'Bolsinha Me Leva Palermo', 'Bolsas', 'Verão 26', '', '6.033 un · R$ 312 mil'],
    ['', '', 'PRODUTO obrigatório (ref). COR opcional. LINHA/COLUNA agrupam a grade. POST_IT e INDICADORES opcionais.', '', '', '', ''],
  ];
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([header, ...examples]);
  ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 24 }];
  xlsx.utils.book_append_sheet(wb, ws, 'PRODUTOS');
  const bookType = path.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
  const buf = xlsx.write(wb, { type: 'buffer', bookType });
  writeFileSync(path, buf);
  return path;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'template') {
    const out = arg || 'modelo-waldemiro.xlsx';
    writeTemplate(out);
    console.log('planilha-padrão escrita ->', out);
  } else if (cmd === 'read') {
    const rows = readSheet(arg);
    console.log(JSON.stringify(rows, null, 2));
    console.error(`${rows.length} produtos lidos de ${arg}`);
  } else {
    console.log('uso: node sheet.mjs template [saida.xlsx] | node sheet.mjs read <planilha>');
  }
}
