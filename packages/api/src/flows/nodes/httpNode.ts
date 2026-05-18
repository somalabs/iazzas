import type { HttpNodeData } from 'librechat-data-provider';
import type { FlowNode, FlowRunContext, FlowRunnerDeps, FlowNodeOutput } from '../types';
import { FlowRunError } from '../types';
import { interpolate } from '../interpolate';

const MAX_BODY_CHARS = 100_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/** Parses `FLOW_HTTP_ALLOWED_HOSTS` (comma-separated, anchored hostnames). */
export function parseAllowedHosts(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);
}

/**
 * Anchored host check. An empty allowlist blocks EVERY request (fail-closed).
 * Matches the exact host or a true subdomain (`endsWith('.' + h)`), so
 * `bfl.ai.evil.com` never matches `bfl.ai`.
 */
export function isAllowedHost(hostname: string, allowed: string[]): boolean {
  if (allowed.length === 0) {
    return false;
  }
  const host = hostname.toLowerCase();
  return allowed.some((h) => host === h || host.endsWith('.' + h));
}

/**
 * HTTP node. The allowlist guard runs BEFORE any network I/O — a blocked host
 * never reaches `deps.httpFetch`. All errors are scrubbed: the URL, headers and
 * body (which may carry interpolated secrets) are never put in the run output.
 */
export async function httpNode(
  node: FlowNode,
  ctx: FlowRunContext,
  deps: FlowRunnerDeps,
): Promise<FlowNodeOutput> {
  const data = node.data as HttpNodeData;
  const il = (s: string | undefined) =>
    interpolate(s ?? '', ctx, { nodeId: node.id, logger: deps.logger });

  const url = il(data.url).trim();
  const method = (data.method || 'GET').toUpperCase();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FlowRunError('HTTP node: invalid URL', { retryable: false, nodeId: node.id });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new FlowRunError('HTTP node: unsupported protocol', {
      retryable: false,
      nodeId: node.id,
    });
  }

  const allowed = parseAllowedHosts(process.env.FLOW_HTTP_ALLOWED_HOSTS);
  if (!isAllowedHost(parsed.hostname, allowed)) {
    throw new FlowRunError('HTTP node: host not allowed by security policy', {
      retryable: false,
      nodeId: node.id,
    });
  }

  const headers: Record<string, string> = {};
  for (const h of data.headers ?? []) {
    if (h && h.key) {
      headers[h.key] = il(h.value);
    }
  }
  const body = BODY_METHODS.has(method) ? il(data.body) : undefined;

  const timeout =
    Number.isInteger(data.timeout) && data.timeout > 0 ? data.timeout : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await deps.httpFetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    if (res.status >= 400) {
      throw new FlowRunError(`HTTP node: request failed with status ${res.status}`, {
        retryable: false,
        nodeId: node.id,
      });
    }
    const output = text.length > MAX_BODY_CHARS ? text.slice(0, MAX_BODY_CHARS) : text;
    return { output, handle: 'default' };
  } catch (err) {
    if (err instanceof FlowRunError) {
      throw err;
    }
    const reason = controller.signal.aborted ? 'timed out' : 'network error';
    throw new FlowRunError(`HTTP node: request ${reason}`, {
      retryable: false,
      nodeId: node.id,
    });
  } finally {
    clearTimeout(timer);
  }
}
