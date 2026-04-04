import { Hono } from 'hono';

import { findAuthUser } from '../../../shared/helpers/find-auth-user';
import { formatUtcTimestamp } from '../../../shared/helpers/format-utc-timestamp';

import type { UserKeyCreateRequest, UserKeyCreateResponse, UserKeysResponse } from '../../../../shared/types/api';
import type { UserKey } from '../../../../shared/types/user-key';
import type { HonoBindings } from '../../../shared/types/hono-bindings';

export const userKeysApi = new Hono<{ Bindings: HonoBindings; }>();
export const userKeysApiBasePath = '/:id/keys';

/** ユーザの公開鍵を登録し既存の鍵を Retired にする */
userKeysApi.post('/', async context => {
  const idParam = context.req.param('id')!;
  const userId = Number(idParam);
  if(!Number.isInteger(userId) || userId < 0) return context.json({ error: 'ユーザ ID は正の整数である必要があります' }, 400);
  
  const authUser = await findAuthUser(context);
  if(authUser == null) return context.json({ error: 'ユーザ認証が必要です' }, 401);
  
  const requestBody: UserKeyCreateRequest | null = await context.req.json<UserKeyCreateRequest>().catch(() => null);
  if(requestBody == null) return context.json({ error: '不正なリクエストボディです' }, 400);
  
  if(typeof requestBody.user_id !== 'number' || !Number.isInteger(requestBody.user_id) || requestBody.user_id < 0) return context.json({ error: 'ユーザ ID は正の整数である必要があります' }, 400);
  if(typeof requestBody.public_key  !== 'string') return context.json({ error: 'Armored 公開鍵は文字列である必要があります' }, 400);
  if(typeof requestBody.fingerprint !== 'string') return context.json({ error: 'フィンガープリントは文字列である必要があります' }, 400);
  const publicKey = requestBody.public_key.trim();
  if(publicKey === '') return context.json({ error: 'Armored 公開鍵は必須です' }, 400);
  const fingerprint = requestBody.fingerprint.trim();
  if(fingerprint === '') return context.json({ error: 'フィンガープリントは必須です' }, 400);
  
  const requestUserId = requestBody.user_id;
  if(authUser.id !== userId || authUser.id !== requestUserId || userId !== requestUserId) return context.json({ error: '別のユーザキーは操作できません' }, 403);
  
  const user = await context.env.DB
    .prepare('SELECT id FROM users WHERE id = ? LIMIT 1')
    .bind(userId)
    .first<{ id: number; }>();
  if(user == null) return context.json({ error: 'ユーザが見つかりませんでした' }, 404);
  
  // 同一のフィンガープリントが既に登録されていないかチェックする
  const existingKey = await context.env.DB
    .prepare('SELECT id FROM user_keys WHERE user_id = ? AND fingerprint = ? LIMIT 1')
    .bind(userId, fingerprint)
    .first<{ id: number; }>();
  
  // NOTE : 既に `active` であればそのまま成功として扱っても良いが、ココでは「既に登録されている」という意図で Conflict 409 を返す
  if(existingKey != null) return context.json({ error: 'この公開鍵は既に登録されています' }, 409);
  
  // 既存の鍵を Retired に更新する
  const createdAt = formatUtcTimestamp(new Date());
  await context.env.DB
    .prepare('UPDATE user_keys SET status = \'retired\', retired_at = ? WHERE user_id = ? AND status = \'active\'')
    .bind(createdAt, userId)
    .run();
  
  // 新規鍵を登録する
  const insertResult = await context.env.DB
    .prepare('INSERT INTO user_keys (user_id, public_key, fingerprint, status, created_at, retired_at) VALUES (?, ?, ?, ?, ?, NULL)')
    .bind(userId, publicKey, fingerprint, 'active', createdAt)
    .run();
  const userKeyCreateResponse: UserKeyCreateResponse = { result: { id: insertResult.meta.last_row_id } };
  return context.json(userKeyCreateResponse, 201);
});

/** 指定ユーザの公開鍵履歴を返す */
userKeysApi.get('/', async context => {
  const idParam = context.req.param('id')!;
  const userId = Number(idParam);
  if(!Number.isInteger(userId) || userId < 0) return context.json({ error: 'ユーザ ID は正の整数である必要があります' }, 400);
  
  const user = await context.env.DB
    .prepare('SELECT id FROM users WHERE id = ? LIMIT 1')
    .bind(userId)
    .first<{ id: number; }>();
  if(user == null) return context.json({ error: 'ユーザが見つかりませんでした' }, 404);
  
  const result = await context.env.DB
    .prepare('SELECT id, public_key, fingerprint, status FROM user_keys WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .bind(userId)
    .all<UserKey>();
  
  const userKeysResponse: UserKeysResponse = { result: result.results };
  return context.json(userKeysResponse, 200);
});
