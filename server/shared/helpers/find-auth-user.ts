import { verify } from 'hono/jwt';

import { jwtIssuer } from '../constants/constants';

import type { AuthUser } from '../../../shared/types/user';
import type { HonoBindings } from '../types/hono-bindings';
import type { JwtPayload } from '../types/jwt-payload';
import type { Context } from 'hono';

/**
 * Bearer トークンを抽出する
 * 
 * @param context Hono コンテキスト
 * @return Bearer トークン・取得失敗時は `null`
 */
const getBearerToken = (context: Context<{ Bindings: HonoBindings; }>): string | null => {
  const authorization = context.req.header('authorization');
  if(authorization == null) return null;
  
  const matched = authorization.match((/^Bearer\s+(.+)$/i));
  if(matched == null) return null;
  
  return matched[1]?.trim() ?? null;
};

/**
 * hono/jwt で JWT を検証する
 * 
 * @param token JWT 文字列
 * @param secret 署名シークレット
 * @return 検証済みペイロード・失敗時は `null`
 */
const verifyJwt = async (token: string, secret: string): Promise<JwtPayload | null> => {
  let payload: unknown;
  try {
    payload = await verify(token, secret, 'HS256');
  }
  catch {
    return null;
  }
  
  if(payload == null || typeof payload !== 'object') return null;
  
  const record = payload as Record<string, unknown>;
  if(typeof record.sub !== 'number' || !Number.isInteger(record.sub) || record.sub <= 0) return null;
  if(typeof record.name !== 'string') return null;
  if(typeof record.iat !== 'number' || typeof record.exp !== 'number') return null;
  if(record.iss !== jwtIssuer) return null;
  
  return record as JwtPayload;
};

/**
 * 認証済みユーザを取得する
 * 
 * @param context Hono コンテキスト
 * @return 認証済みユーザ・失敗時は `null`
 */
export const findAuthUser = async (context: Context<{ Bindings: HonoBindings; }>): Promise<AuthUser | null> => {
  const token = getBearerToken(context);
  if(token == null) return null;
  
  const payload = await verifyJwt(token, context.env.JWT_SECRET);
  if(payload == null) return null;
  
  const user = await context.env.DB
    .prepare('SELECT id, name, display_name FROM users WHERE id = ? LIMIT 1')
    .bind(payload.sub)
    .first<AuthUser>();
  if(user == null) return null;
  
  return user;
};
