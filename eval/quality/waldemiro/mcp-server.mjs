// Waldemiro MCP server — exposes the deterministic moodboard engine as tools the
// IAzzas model calls. Hybrid productization: the model curates the product list
// (from the Azzas data MCPs or an uploaded sheet) and calls `montar_moodboard`;
// this tool owns the layout math + photo-URL resolution and returns ready-to-run
// Miro ops, which the model executes with its existing Miro MCP (layout_create +
// image_create). Pure compute + photo fetch — no Miro credentials needed here.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { buildLayout, toMiroOps, validate } from './gen.mjs';

const PRODUTO = z.object({
  prod: z.string().describe('Referência do produto (ex.: 347544). Obrigatório.'),
  cor: z.string().optional().describe('Código de cor (ex.: 52981). Compõe a foto reference_id {prod}_{cor}.'),
  texto: z.string().optional().describe('Descrição/nome exibido sob a foto.'),
  linha: z.string().optional().describe('Agrupamento por linha da grade (ex.: categoria: Vestidos).'),
  coluna: z.string().optional().describe('Agrupamento por coluna da grade (ex.: coleção: Verão 26).'),
  postit: z.string().optional().describe('Marcador no canto da foto (ex.: TOP, NOVO).'),
  indicadores: z.string().optional().describe('Indicadores na legenda (ex.: "5.190 un · R$ 1,3M · R$ 250/un").'),
});

async function resolvePhotos(images) {
  await Promise.all(
    images.map(async (im) => {
      try {
        const r = await fetch(im.url, { redirect: 'follow' });
        im.finalUrl = r.ok ? r.url : im.url;
        im.photoOk = r.ok && (r.headers.get('content-type') || '').startsWith('image');
      } catch {
        im.finalUrl = im.url;
        im.photoOk = false;
      }
    }),
  );
}

export function createServer() {
  const server = new McpServer({ name: 'waldemiro', version: '1.0.0' });

  server.registerTool(
    'montar_moodboard',
    {
      title: 'Montar moodboard de produtos no Miro',
      description:
        'Calcula o layout determinístico de um moodboard de produtos (grade categoria×coleção, fotos, legendas, indicadores, post-its) e devolve as operações prontas do Miro. Depois de chamar esta tool, EXECUTE no board: 1) layout_create com o campo layout_create_dsl; 2) um image_create para cada item de image_create_calls (use image_url, x, y, width). Forneça a lista de produtos já curada (via consulta aos MCPs de dados ou planilha do usuário).',
      inputSchema: {
        produtos: z.array(PRODUTO).min(1).describe('Lista de produtos curada.'),
        titulo: z.string().optional().describe('Título do board (cabeçalho).'),
        legenda: z.string().optional().describe('Legenda definindo os indicadores e a fonte.'),
        brand: z.number().optional().describe('Brand id da somalabs para as fotos (2 = FARM). Default 2.'),
      },
    },
    async ({ produtos, titulo, legenda, brand }) => {
      const layout = buildLayout(produtos, { titulo, legenda, ...(brand ? { brand } : {}) });
      const v = validate(layout);
      const ops = toMiroOps(layout);
      await resolvePhotos(ops.images);
      const payload = {
        summary: { produtos: produtos.length, grade_colunas: layout.largura, linhas: layout.ordemLinhas, colunas: layout.ordemColunas },
        validacao: v,
        layout_create_dsl: ops.layoutDsl,
        image_create_calls: ops.images.map((im) => ({ title: im.ref, image_url: im.finalUrl, x: im.x, y: im.y, width: im.width, foto_ok: im.photoOk })),
        instrucoes: 'Execute no board do Miro: (1) layout_create(dsl=layout_create_dsl); (2) image_create para cada item de image_create_calls (image_url, x, y, width). Avise quais fotos vieram com foto_ok=false.',
      };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    },
  );

  server.registerTool(
    'gerar_planilha_modelo',
    {
      title: 'Gerar planilha-padrão do moodboard',
      description:
        'Retorna o conteúdo CSV da planilha-padrão que o usuário preenche para montar um moodboard (colunas PRODUTO, COR, TEXTO, LINHA, COLUNA, POST_IT, INDICADORES). Apresente ao usuário para download/preenchimento.',
      inputSchema: {},
    },
    async () => {
      const csv = [
        'PRODUTO,COR,TEXTO,LINHA,COLUNA,POST_IT,INDICADORES',
        '347544,52981,Vestido Midi Bosque Chic,Vestidos,Verão 26,TOP,5.190 un · R$ 1.3M',
        '349258,53657,Bolsinha Me Leva Palermo,Bolsas,Verão 26,,6.033 un · R$ 312 mil',
      ].join('\n');
      return { content: [{ type: 'text', text: csv }] };
    },
  );

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}
