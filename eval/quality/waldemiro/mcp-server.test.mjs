// Validates the waldemiro MCP server end-to-end via an in-memory client<->server
// transport (real SDK, no stdio/process): lists tools and calls montar_moodboard +
// gerar_planilha_modelo, asserting the returned ops are well-formed.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createServer } from './mcp-server.mjs';

const here = (p) => resolve(dirname(fileURLToPath(import.meta.url)), p);
const assert = (cond, msg) => { if (!cond) { console.error('FALHOU:', msg); process.exit(1); } };

const [clientT, serverT] = InMemoryTransport.createLinkedPair();
const server = createServer();
await server.connect(serverT);
const client = new Client({ name: 'test', version: '1.0.0' });
await client.connect(clientT);

const tools = await client.listTools();
const names = tools.tools.map((t) => t.name).sort();
console.log('tools:', names.join(', '));
assert(names.includes('montar_moodboard') && names.includes('gerar_planilha_modelo'), 'tools esperadas ausentes');

const produtos = JSON.parse(readFileSync(here('farm-products.json'), 'utf8'));
const res = await client.callTool({
  name: 'montar_moodboard',
  arguments: { produtos, titulo: 'Moodboard FARM — Verão / Alto Verão 26', legenda: 'un · receita · preço médio | BigQuery' },
});
const payload = JSON.parse(res.content[0].text);
console.log('summary:', JSON.stringify(payload.summary));
console.log('validacao.ok:', payload.validacao.ok, '| fotos:', payload.image_create_calls.length, '| layout linhas:', payload.layout_create_dsl.split('\n').length);
assert(payload.validacao.ok, 'layout com sobreposição');
assert(payload.image_create_calls.length === produtos.length, 'nº de imagens != nº de produtos');
assert(payload.layout_create_dsl.includes('ttl TEXT') || payload.layout_create_dsl.includes('Moodboard'), 'cabeçalho/título ausente no DSL');
const fotosOk = payload.image_create_calls.filter((i) => i.foto_ok).length;
console.log('fotos resolvidas OK:', fotosOk + '/' + payload.image_create_calls.length);
assert(payload.image_create_calls.every((i) => /^https:\/\//.test(i.image_url)), 'image_url inválida');

const tpl = await client.callTool({ name: 'gerar_planilha_modelo', arguments: {} });
assert(tpl.content[0].text.startsWith('PRODUTO,COR,TEXTO'), 'planilha-padrão com header errado');
console.log('planilha-padrão: header OK');

await client.close();
console.log('\n✓ TODOS OS CHECKS PASSARAM');
