import { Hono } from 'hono';
import { sign } from 'hono/jwt';

import { verifyPassword } from './helpers/verify-password';
import { jwtDurationSeconds, jwtIssuer } from '../../shared/constants/constants';
import { findAuthUser } from '../../shared/helpers/find-auth-user';
import { nowEpochSeconds } from '../../shared/helpers/now-epoch-seconds';

import type { UserWithPassword } from './types/user-with-password';
import type { AuthCheckTokenResponse, AuthLoginRequest, AuthLoginResponse } from '../../../shared/types/api';
import type { HonoBindings } from '../../shared/types/hono-bindings';

export const authApi = new Hono<{ Bindings: HonoBindings; }>();
export const authApiBasePath = '/auth';

/** ログイン */
authApi.post('/login', async context => {
  const loginRequest: AuthLoginRequest | null = await context.req.json<AuthLoginRequest>().catch(() => null);
  if(loginRequest == null) return context.json({ error: '不正なリクエストボディです' }, 400);
  if(typeof loginRequest.name !== 'string' || typeof loginRequest.password !== 'string') return context.json({ error: 'ログインユーザ名とパスワードの形式が不正です' }, 400);
  
  const name     = loginRequest.name.trim();
  const password = loginRequest.password.trim();
  if(name === '' || password === '') return context.json({ error: 'ログインユーザ名とパスワードは必須です' }, 400);
  
  const user = await context.env.DB
    .prepare('SELECT id, name, display_name, password_hash, password_salt FROM users WHERE name = ? LIMIT 1')
    .bind(name)
    .first<UserWithPassword>();
  if(user == null) return context.json({ error: 'ユーザが見つかりませんでした' }, 404);
  
  const isValidPassword = await verifyPassword(password, user.password_hash, user.password_salt);
  if(!isValidPassword) return context.json({ error: 'パスワードが間違っています' }, 401);
  
  const iat = nowEpochSeconds();
  const token = await sign({
    sub : user.id,
    name: user.name,
    iat : iat,
    exp : iat + jwtDurationSeconds,
    iss : jwtIssuer
  }, context.env.JWT_SECRET, 'HS256');
  
  const loginResponse: AuthLoginResponse = {
    result: {
      token: token,
      user : {
        id          : user.id,
        name        : user.name,
        display_name: user.display_name
      }
    }
  };
  return context.json(loginResponse);
});

/** ログインユーザの JWT をチェックする */
authApi.get('/check-token', async context => {
  const authUser = await findAuthUser(context);
  if(authUser == null) return context.json({ result: { is_authenticated: false } });
  
  const checkTokenResponse: AuthCheckTokenResponse = {
    result: {
      is_authenticated: true,
      user: {
        id          : authUser.id,
        name        : authUser.name,
        display_name: authUser.display_name
      }
    }
  };
  return context.json(checkTokenResponse);
});
