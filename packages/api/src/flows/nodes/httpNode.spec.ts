import type { FlowNode, FlowRunnerDeps } from '../types';
import { httpNode, isAllowedHost, parseAllowedHosts } from './httpNode';
import { FlowRunError } from '../types';

const node = (data: object): FlowNode => ({
  id: 'h1',
  type: 'http',
  position: { x: 0, y: 0 },
  data: { type: 'http', headers: [], timeout: 5000, ...data } as unknown as FlowNode['data'],
});

const baseLogger = { warn: () => {}, error: () => {} };

describe('isAllowedHost', () => {
  it('empty allowlist blocks everything', () => {
    expect(isAllowedHost('api.example.com', [])).toBe(false);
  });
  it('matches exact host and true subdomains only', () => {
    const a = parseAllowedHosts('bfl.ai, api.example.com');
    expect(isAllowedHost('bfl.ai', a)).toBe(true);
    expect(isAllowedHost('delivery-1.bfl.ai', a)).toBe(true);
    expect(isAllowedHost('bfl.ai.evil.com', a)).toBe(false);
    expect(isAllowedHost('evil.com', a)).toBe(false);
  });
});

describe('httpNode security guard', () => {
  const ORIG = process.env.FLOW_HTTP_ALLOWED_HOSTS;
  afterEach(() => {
    process.env.FLOW_HTTP_ALLOWED_HOSTS = ORIG;
  });

  it('does NOT call httpFetch for a blocked host', async () => {
    process.env.FLOW_HTTP_ALLOWED_HOSTS = 'api.example.com';
    const httpFetch = jest.fn();
    const deps = { logger: baseLogger, now: () => new Date(0), httpFetch } as unknown as FlowRunnerDeps;
    for (const url of [
      'https://evil.com/x',
      'https://bfl.ai.evil.com/x',
      'http://localhost/x',
      'http://169.254.169.254/latest/meta-data',
    ]) {
      await expect(httpNode(node({ url, method: 'GET' }), {}, deps)).rejects.toBeInstanceOf(
        FlowRunError,
      );
    }
    expect(httpFetch).not.toHaveBeenCalled();
  });

  it('blocked-host error is scrubbed (no URL leaked)', async () => {
    process.env.FLOW_HTTP_ALLOWED_HOSTS = '';
    const deps = {
      logger: baseLogger,
      now: () => new Date(0),
      httpFetch: jest.fn(),
    } as unknown as FlowRunnerDeps;
    try {
      await httpNode(node({ url: 'https://secret.internal/path?token=abc', method: 'GET' }), {}, deps);
      throw new Error('should throw');
    } catch (err) {
      expect((err as Error).message).not.toContain('secret.internal');
      expect((err as Error).message).not.toContain('token=abc');
    }
  });

  it('performs the request for an allowed host and returns body', async () => {
    process.env.FLOW_HTTP_ALLOWED_HOSTS = 'api.example.com';
    const httpFetch = jest
      .fn()
      .mockResolvedValue({ status: 200, text: async () => 'OK-BODY' });
    const deps = { logger: baseLogger, now: () => new Date(0), httpFetch } as unknown as FlowRunnerDeps;
    const out = await httpNode(
      node({ url: 'https://api.example.com/v1', method: 'POST', body: 'hi {{x}}' }),
      { x: 'there' },
      deps,
    );
    expect(out.output).toBe('OK-BODY');
    expect(httpFetch).toHaveBeenCalledTimes(1);
    expect(httpFetch.mock.calls[0][1].body).toBe('hi there');
  });

  it('non-2xx becomes a scrubbed non-retryable error', async () => {
    process.env.FLOW_HTTP_ALLOWED_HOSTS = 'api.example.com';
    const httpFetch = jest.fn().mockResolvedValue({ status: 500, text: async () => 'secret-trace' });
    const deps = { logger: baseLogger, now: () => new Date(0), httpFetch } as unknown as FlowRunnerDeps;
    try {
      await httpNode(node({ url: 'https://api.example.com', method: 'GET' }), {}, deps);
      throw new Error('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FlowRunError);
      expect((err as Error).message).not.toContain('secret-trace');
      expect((err as FlowRunError).retryable).toBe(false);
    }
  });
});
