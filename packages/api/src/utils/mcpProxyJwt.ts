import jwt from 'jsonwebtoken';
import { logger } from '@librechat/data-schemas';
import type { IUser } from '@librechat/data-schemas';

/**
 * Placeholder substituted with a freshly-minted HS256 JWT signed with
 * `MCP_PROXY_SIGNING_KEY`. Bq-analista accepts this audience-scoped token
 * (`aud: "mcp-core-proxy"`) and extracts the `email` claim for allowlist
 * enforcement. Lets the LibreChat backend authenticate to MCP servers
 * without depending on the user's federated OIDC tokens (which are absent
 * when the upstream IdP does not emit refresh tokens).
 */
export const MCP_PROXY_JWT_PLACEHOLDER = '{{LIBRECHAT_MCP_PROXY_JWT}}';

const DEFAULT_TTL_SECONDS = 300;
const AUDIENCE = 'mcp-core-proxy';

let warnedMissingKey = false;

export function generateMcpProxyJwt(
  email: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string | null {
  const secret = process.env.MCP_PROXY_SIGNING_KEY;
  if (!secret) {
    if (!warnedMissingKey) {
      logger.warn(
        '[mcpProxyJwt] MCP_PROXY_SIGNING_KEY not set — MCP proxy JWT placeholder will not be resolved',
      );
      warnedMissingKey = true;
    }
    return null;
  }
  return jwt.sign({ email, aud: AUDIENCE }, secret, { algorithm: 'HS256', expiresIn: ttlSeconds });
}

export function processProxyJwtPlaceholder(value: string, user?: Partial<IUser>): string {
  if (typeof value !== 'string' || !value.includes(MCP_PROXY_JWT_PLACEHOLDER)) {
    return value;
  }
  const email = user?.email;
  if (!email) return value;
  const token = generateMcpProxyJwt(email);
  if (!token) return value;
  return value.split(MCP_PROXY_JWT_PLACEHOLDER).join(token);
}
