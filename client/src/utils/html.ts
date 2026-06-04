import { visit } from 'unist-util-visit';
import { fromHtml } from 'hast-util-from-html';
import type { Root, RootContent, Element, Parent } from 'hast';
import type { Plugin } from 'unified';

/**
 * `raw` nodes are produced by `remark-rehype` (via react-markdown) for inline
 * and block HTML, but they are not part of the typed hast node union.
 */
interface RawNode {
  type: 'raw';
  value: string;
}

const isRawNode = (node: unknown): node is RawNode =>
  typeof node === 'object' &&
  node !== null &&
  (node as { type?: unknown }).type === 'raw' &&
  typeof (node as { value?: unknown }).value === 'string';

/**
 * Tags that must never be rendered from model output, even when HTML rendering
 * is enabled. These either execute code, load external resources, or capture
 * input.
 */
const BLOCKED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'base',
  'meta',
  'link',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'noscript',
  'html',
  'head',
  'body',
  'title',
]);

const URL_PROPS = new Set([
  'href',
  'src',
  'srcSet',
  'action',
  'formAction',
  'poster',
  'background',
  'cite',
  'xlinkHref',
]);

const isUnsafeUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  // eslint-disable-next-line no-control-regex
  const normalized = value.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  return (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html')
  );
};

const sanitizeProperties = (element: Element): void => {
  const properties = element.properties;
  if (!properties) {
    return;
  }
  for (const key of Object.keys(properties)) {
    if (/^on/i.test(key)) {
      delete properties[key];
      continue;
    }
    if (URL_PROPS.has(key) && isUnsafeUrl(properties[key])) {
      delete properties[key];
    }
  }
};

const sanitizeNodes = (nodes: RootContent[]): RootContent[] => {
  const result: RootContent[] = [];
  for (const node of nodes) {
    if (node.type === 'element') {
      if (BLOCKED_TAGS.has(node.tagName)) {
        continue;
      }
      sanitizeProperties(node);
      node.children = sanitizeNodes(node.children) as Element['children'];
    }
    result.push(node);
  }
  return result;
};

/**
 * Renders raw HTML blocks emitted by the model (e.g. `<table>` with inline
 * styles) instead of escaping them as plain text. Operates surgically on `raw`
 * nodes only, so the markdown AST and the app's custom elements (citations,
 * MCP UI, artifacts, KaTeX) are left untouched — unlike `rehype-raw`, which
 * roundtrips the whole tree through HTML and corrupts object-valued props.
 *
 * Each parsed fragment is sanitized with a denylist that drops executable tags,
 * event-handler attributes, and unsafe URLs.
 */
export const rehypeRenderRawHtml: Plugin<[], Root> = () => (tree: Root) => {
  visit(tree, (node, index, parent) => {
    if (!parent || index == null || !isRawNode(node)) {
      return;
    }
    const fragment = fromHtml((node as RawNode).value, { fragment: true });
    const safe = sanitizeNodes(fragment.children as RootContent[]);
    (parent as Parent).children.splice(index, 1, ...(safe as Parent['children']));
    return index + safe.length;
  });
};
