import { Hono } from 'hono';

import { hashPassword } from './helpers/hash-password';
import { userKeysApi, userKeysApiBasePath } from './user-keys/user-keys';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { signupLoginSchema, userUpdateSchema } from '../../../shared/schemas/user';
import { findAuthUser } from '../../shared/helpers/find-auth-user';
import { formatUtcTimestamp } from '../../shared/helpers/format-utc-timestamp';
import { verifyPassword } from '../auth/helpers/verify-password';

import type { UserCreateRequest, UserCreateResponse, UserUpdateRequest, UserUpdateResponse } from '../../../shared/types/api';
import type { HonoBindings } from '../../shared/types/hono-bindings';
import type { UserWithPassword } from '../auth/types/user-with-password';

export const usersApi = new Hono<{ Bindings: HonoBindings; }>();
export const usersApiBasePath = '/users';

/** ユーザを登録する */
usersApi.post('/', async context => {
  const userCreateRequest: UserCreateRequest | null = await context.req.json<UserCreateRequest>().catch(() => null)
  if(userCreateRequest == null) return context.json({ error: '不正なリクエストボディです' }, 400);
  
  const parsed = signupLoginSchema.safeParse(userCreateRequest);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  const name           = parsed.data.name;
  const password       = parsed.data.password;
  const createdAt      = formatUtcTimestamp(new Date());
  const passwordDigest = await hashPassword(password);
  
  let insertResult;
  try {
    // 初回は `display_name` にも `name` の値をセットしておく
    insertResult = await context.env.DB
      .prepare('INSERT INTO users (name, display_name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(name, name, passwordDigest.hash, passwordDigest.salt, createdAt)
      .run();
  }
  catch(error) {
    const message = error instanceof Error ? error.message : '';
    if(message.includes('UNIQUE')) return context.json({ error: '指定のユーザ名は既に使用されています' }, 409);
    throw error;
  }
  
  const userCreateResponse: UserCreateResponse = { result: { id: insertResult.meta.last_row_id } };
  return context.json(userCreateResponse, 201);
});

/** ユーザ情報を更新する */
usersApi.patch('/me', async context => {
  const authUser = await findAuthUser(context);
  if(authUser == null) return context.json({ error: 'ユーザ認証が必要です' }, 401);
  
  const userUpdateRequest: UserUpdateRequest | null = await context.req.json<UserUpdateRequest>().catch(() => null);
  if(userUpdateRequest == null) return context.json({ error: '不正なリクエストボディです' }, 400);
  
  const parsed = userUpdateSchema.safeParse(userUpdateRequest);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  const { display_name, current_password, new_password } = parsed.data;
  
  // 現在のユーザ情報を取得する
  const user = await context.env.DB
    .prepare('SELECT id, display_name, password_hash, password_salt FROM users WHERE id = ? LIMIT 1')
    .bind(authUser.id)
    .first<UserWithPassword>();
  if(user == null) return context.json({ error: 'ユーザが見つかりませんでした' }, 404);
  
  let nextDisplayName  = user.display_name;
  let nextPasswordHash = user.password_hash;
  let nextPasswordSalt = user.password_salt;
  
  // 表示名の更新があれば取り込む
  if(display_name != null && display_name !== '') nextDisplayName = display_name;
  // パスワード更新があれば取り込む
  if(new_password != null && new_password !== '') {
    if(current_password == null || current_password === '') return context.json({ error: 'パスワードを変更するには現在のパスワードを入力してください' }, 400);
    if(current_password === new_password) return context.json({ error: '新しいパスワードは現在のパスワードと異なるものを入力してください' }, 400);
    
    const isValidCurrentPassword = await verifyPassword(current_password, user.password_hash, user.password_salt);
    if(!isValidCurrentPassword) return context.json({ error: '現在のパスワードが間違っています' }, 401);
    
    const { hash, salt } = await hashPassword(new_password);
    nextPasswordHash = hash;
    nextPasswordSalt = salt;
  }
  
  // 3項目に UPDATE をかける
  await context.env.DB
    .prepare('UPDATE users SET display_name = ?, password_hash = ?, password_salt = ? WHERE id = ?')
    .bind(nextDisplayName, nextPasswordHash, nextPasswordSalt, authUser.id)
    .run();
  
  const response: UserUpdateResponse = {
    result: {
      id          : authUser.id,
      display_name: nextDisplayName
    }
  };
  return context.json(response);
});

/** ユーザを削除する */
usersApi.delete('/me', async context => {
  const authUser = await findAuthUser(context);
  if(authUser == null) return context.json({ error: 'ユーザ認証が必要です' }, 401);
  
  // バッチは使わないでおく
  await context.env.DB.prepare('DELETE FROM posts WHERE user_id = ?').bind(authUser.id).run();
  await context.env.DB.prepare('DELETE FROM user_keys WHERE user_id = ?').bind(authUser.id).run();
  await context.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(authUser.id).run();
  
  return context.body(null, 204);  // No Content
});

usersApi.route(userKeysApiBasePath, userKeysApi);
