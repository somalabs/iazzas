import { ContentTypes, ToolCallTypes } from 'librechat-data-provider';
import { groupAgentParts } from '../groupToolCalls';

type Part = Parameters<typeof groupAgentParts>[0][number]['part'];

const think = (t: string) => ({ type: ContentTypes.THINK, think: t }) as unknown as Part;
const tool = (name: string) =>
  ({
    type: ContentTypes.TOOL_CALL,
    [ContentTypes.TOOL_CALL]: { id: name, name, args: '{}', type: ToolCallTypes.TOOL_CALL },
  }) as unknown as Part;
const text = (t: string) => ({ type: ContentTypes.TEXT, text: t }) as unknown as Part;

const wrap = (parts: Part[]) => parts.map((part, idx) => ({ part, idx }));

describe('groupAgentParts', () => {
  it('collapses interleaved reasoning + tool calls into one reasoning group and one tool group', () => {
    const groups = groupAgentParts(
      wrap([
        think('a'),
        tool('get_context_mcp_x'),
        think('b'),
        tool('describe_table_mcp_x'),
        think('c'),
        tool('consultar_bq_mcp_x'),
        text('resposta'),
      ]),
    );
    expect(groups.map((g) => g.type)).toEqual(['reasoning-group', 'tool-group', 'single']);
    const reasoning = groups[0] as { type: 'reasoning-group'; parts: unknown[] };
    const toolGroup = groups[1] as { type: 'tool-group'; parts: unknown[] };
    expect(reasoning.parts).toHaveLength(3);
    expect(toolGroup.parts).toHaveLength(3);
  });

  it('keeps a lone tool call inline (not grouped) so its output stays visible', () => {
    const groups = groupAgentParts(wrap([think('a'), tool('consultar_bq_mcp_x'), text('r')]));
    expect(groups.map((g) => g.type)).toEqual(['reasoning-group', 'single', 'single']);
  });

  it('never folds output-bearing tools (web_search, image gen, code) into the group', () => {
    const groups = groupAgentParts(wrap([tool('web_search'), tool('gemini_image_gen')]));
    expect(groups.map((g) => g.type)).toEqual(['single', 'single']);
  });

  it('ignores empty/whitespace text boundaries between steps (keeps one group)', () => {
    const groups = groupAgentParts(
      wrap([
        think('a'),
        tool('consultar_bq_mcp_x'),
        text(''),
        tool('describe_table_mcp_x'),
        text('   '),
        tool('consultar_bq_mcp_x'),
      ]),
    );
    expect(groups.map((g) => g.type)).toEqual(['reasoning-group', 'tool-group']);
    const toolGroup = groups[1] as { type: 'tool-group'; parts: unknown[] };
    expect(toolGroup.parts).toHaveLength(3);
  });

  it('flushes buffers when a text part interrupts the sequence', () => {
    const groups = groupAgentParts(
      wrap([
        think('a'),
        tool('consultar_bq_mcp_x'),
        tool('describe_table_mcp_x'),
        text('parcial'),
        tool('consultar_bq_mcp_x'),
        tool('consultar_bq_mcp_x'),
      ]),
    );
    expect(groups.map((g) => g.type)).toEqual([
      'reasoning-group',
      'tool-group',
      'single',
      'tool-group',
    ]);
  });
});
