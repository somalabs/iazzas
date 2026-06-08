import { Constants, ContentTypes, ToolCallTypes } from 'librechat-data-provider';
import type { TMessageContentParts, Agents } from 'librechat-data-provider';
import type { PartWithIndex } from '~/components/Chat/Messages/Content/ParallelContent';

export type GroupedPart =
  | { type: 'single'; part: PartWithIndex }
  | { type: 'tool-group'; parts: PartWithIndex[] };

function isGroupableToolCall(part: TMessageContentParts): boolean {
  if (part.type !== ContentTypes.TOOL_CALL) {
    return false;
  }
  const toolCall = part[ContentTypes.TOOL_CALL] as Agents.ToolCall | undefined;
  if (!toolCall) {
    return false;
  }
  const isStandardToolCall =
    'args' in toolCall && (!toolCall.type || toolCall.type === ToolCallTypes.TOOL_CALL);
  if (isStandardToolCall && toolCall.name?.startsWith(Constants.LC_TRANSFER_TO_)) {
    return false;
  }
  return true;
}

export function groupSequentialToolCalls(parts: PartWithIndex[]): GroupedPart[] {
  const result: GroupedPart[] = [];
  let currentGroup: PartWithIndex[] = [];

  const flushGroup = () => {
    if (currentGroup.length >= 2) {
      result.push({ type: 'tool-group', parts: [...currentGroup] });
    } else {
      for (const p of currentGroup) {
        result.push({ type: 'single', part: p });
      }
    }
    currentGroup = [];
  };

  for (const item of parts) {
    if (isGroupableToolCall(item.part)) {
      currentGroup.push(item);
    } else {
      flushGroup();
      result.push({ type: 'single', part: item });
    }
  }
  flushGroup();

  return result;
}

/**
 * Tools whose output IS content the user should see inline (generated images,
 * web-search results, executed code, file search) and agent handoffs are never
 * folded into the collapsed tool group — only generic MCP/function tool calls,
 * which render as a one-line ToolCall row, are groupable.
 */
const INLINE_TOOL_NAMES = new Set<string>([
  'execute_code',
  Constants.PROGRAMMATIC_TOOL_CALLING as string,
  'image_gen_oai',
  'image_edit_oai',
  'gemini_image_gen',
  'web_search',
  'file_search',
  'retrieval',
]);

function isReasoningPart(part: TMessageContentParts): boolean {
  return (
    part.type === ContentTypes.THINK ||
    typeof (part as unknown as { think?: unknown }).think === 'string'
  );
}

/**
 * Empty / whitespace-only TEXT parts are emitted between agent steps as
 * boundaries; they render to nothing (see Part.tsx). They must NOT flush the
 * reasoning/tool buffers — otherwise an interleaved turn fragments back into
 * many rows. Only real (non-empty) text flushes.
 */
function isIgnorableTextPart(part: TMessageContentParts): boolean {
  if (part.type !== ContentTypes.TEXT) {
    return false;
  }
  const raw = (part as unknown as { text?: string | { value?: string } }).text;
  const text = typeof raw === 'string' ? raw : raw?.value;
  return typeof text !== 'string' || text.length === 0 || /^\s*$/.test(text);
}

function isPlainGroupableToolCall(part: TMessageContentParts): boolean {
  if (part.type !== ContentTypes.TOOL_CALL) {
    return false;
  }
  const toolCall = part[ContentTypes.TOOL_CALL] as Agents.ToolCall | undefined;
  if (!toolCall) {
    return false;
  }
  const isStandardToolCall =
    'args' in toolCall && (!toolCall.type || toolCall.type === ToolCallTypes.TOOL_CALL);
  if (!isStandardToolCall) {
    return false;
  }
  const name = toolCall.name ?? '';
  if (name.startsWith(Constants.LC_TRANSFER_TO_)) {
    return false;
  }
  return !INLINE_TOOL_NAMES.has(name);
}

export type AgentGroupedPart =
  | { type: 'single'; part: PartWithIndex }
  | { type: 'tool-group'; parts: PartWithIndex[] }
  | { type: 'reasoning-group'; parts: PartWithIndex[] };

/**
 * Coalesces an agent turn so it renders as (at most) one reasoning line and one
 * tool-call line, then the answer — instead of one row per step. Reasoning
 * (THINK) and plain tool calls accumulate without flushing each other, so an
 * interleaved reasoning/tool/reasoning/tool sequence collapses into a single
 * "Processo de raciocínio" disclosure + a single "Usou N ferramentas" group.
 *
 * Any other part (text answer, image, web search, agent handoff) flushes the
 * buffers first, preserving order. A lone tool call stays inline (so its output
 * is visible); the group is only used for 2+ tools.
 */
export function groupAgentParts(parts: PartWithIndex[]): AgentGroupedPart[] {
  const result: AgentGroupedPart[] = [];
  let reasoning: PartWithIndex[] = [];
  let tools: PartWithIndex[] = [];

  const flush = () => {
    if (reasoning.length > 0) {
      result.push({ type: 'reasoning-group', parts: [...reasoning] });
      reasoning = [];
    }
    if (tools.length >= 2) {
      result.push({ type: 'tool-group', parts: [...tools] });
    } else {
      for (const p of tools) {
        result.push({ type: 'single', part: p });
      }
    }
    tools = [];
  };

  const lastIdx = parts.length > 0 ? parts[parts.length - 1].idx : -1;

  for (const item of parts) {
    if (isReasoningPart(item.part)) {
      reasoning.push(item);
    } else if (isPlainGroupableToolCall(item.part)) {
      tools.push(item);
    } else if (isIgnorableTextPart(item.part) && item.idx !== lastIdx) {
      // Empty step-boundary text: drop it without breaking the grouping.
      continue;
    } else {
      flush();
      result.push({ type: 'single', part: item });
    }
  }
  flush();

  return result;
}
