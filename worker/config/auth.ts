import type { Env } from '../types';

export const AUTHORIZED_USERS = ['ali', 'hammad', 'sabih', 'benji', 'steven', 'vic'];
export const DEFAULT_ADMIN_SECRET_TOKEN = 'super_secret_admin_token_123';

export function getAdminSecretToken(env: Env): string {
  return env.ADMIN_SECRET_TOKEN || DEFAULT_ADMIN_SECRET_TOKEN;
}

export function isAuthorizedUser(username?: string): boolean {
  if (!username) return false;
  return AUTHORIZED_USERS.includes(username.toLowerCase().trim());
}

export function verifyAdminToken(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = getAdminSecretToken(env);
  return authHeader === `Bearer ${expectedToken}`;
}

