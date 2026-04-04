import { Hono } from 'hono';

import { findAuthUser } from '../../shared/helpers/find-auth-user';
import { formatUtcTimestamp } from '../../shared/helpers/format-utc-timestamp';

import type { PostCreateRequest, PostCreateResponse, PostsResponse } from '../../../shared/types/api';
import type { Post } from '../../../shared/types/post';
import type { HonoBindings } from '../../shared/types/hono-bindings';

export const postsApi = new Hono<{ Bindings: HonoBindings; }>();
export const postsApiBasePath = '/posts';

/** 投稿作成する */
postsApi.post('/', async context => {
  const authUser = await findAuthUser(context);
  if(authUser == null) return context.json({ error: 'ユーザ認証が必要です' }, 401);
  
  const postCreateRequest: PostCreateRequest | null = await context.req.json<PostCreateRequest>().catch(() => null);
  if(postCreateRequest == null) return context.json({ error: '不正なリクエストボディです' }, 400);
  
  if(typeof postCreateRequest.user_id !== 'number'     || !Number.isInteger(postCreateRequest.user_id)     || postCreateRequest.user_id     < 0) return context.json({ error: 'ユーザ ID は正の整数である必要があります'   }, 400);
  if(typeof postCreateRequest.user_key_id !== 'number' || !Number.isInteger(postCreateRequest.user_key_id) || postCreateRequest.user_key_id < 0) return context.json({ error: 'ユーザ鍵 ID は正の整数である必要があります' }, 400);
  if(typeof postCreateRequest.ciphertext !== 'string') return context.json({ error: '暗号文は文字列である必要があります' }, 400);
  const ciphertext = postCreateRequest.ciphertext.trim();
  if(ciphertext === '') return context.json({ error: '暗号文は必須です' }, 400);
  
  const userId    = postCreateRequest.user_id;
  const userKeyId = postCreateRequest.user_key_id;
  if(authUser.id !== userId) return context.json({ error: '他のユーザによる投稿は作成できません' }, 403);
  
  // Repository
  const user = await context.env.DB
    .prepare('SELECT id FROM users WHERE id = ? LIMIT 1')
    .bind(userId)
    .first<{ id: number; }>();
  if(user == null) return context.json({ error: 'ユーザが見つかりませんでした' }, 404);
  
  // Repository
  const userKey = await context.env.DB
    .prepare('SELECT id, user_id FROM user_keys WHERE id = ? LIMIT 1')
    .bind(userKeyId)
    .first<{ id: number; user_id: number; }>();
  if(userKey == null) return context.json({ error: 'ユーザ鍵が見つかりませんでした' }, 404);
  if(userKey.user_id !== userId) return context.json({ error: '対象のユーザキーは指定ユーザに属していません' }, 400);
  
  const createdAt = formatUtcTimestamp(new Date());
  
  const insertRresult = await context.env.DB
    .prepare('INSERT INTO posts (user_id, user_key_id, ciphertext, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, userKeyId, ciphertext, createdAt)
    .run();
  const postCreateResponse: PostCreateResponse = { result: { id: insertRresult.meta.last_row_id } };
  return context.json(postCreateResponse, 201);
});

/** 投稿一覧を取得する */
postsApi.get('/', async context => {
  const lastIdQuery = context.req.query('last_id');
  let lastId: number | null = null;
  if(lastIdQuery != null && lastIdQuery !== '') {
    const parsedLastId = Number(lastIdQuery);
    if(!Number.isInteger(parsedLastId) || parsedLastId <= 0) return context.json({ error: 'ID 指定は正の整数である必要があります' }, 400);
    
    lastId = parsedLastId;
  }
  
  const postsToLoad = 10;
  let postsQuery = context.env.DB.prepare(`
    SELECT
      posts.id AS id,
      posts.user_id,
      posts.user_key_id,
      posts.ciphertext,
      posts.created_at,
      users.display_name
    FROM posts
    LEFT JOIN users ON posts.user_id = users.id
    ${lastId != null ? ' WHERE posts.id <= ? ' : ' '}
    ORDER BY id DESC
    LIMIT 10
  `);
  if(lastId != null) postsQuery = postsQuery.bind(lastId);
  
  const posts = await postsQuery.all<Post>();
  const isLast = posts.results.length < postsToLoad;  // 10件取得できなければフィードの最後とみなす
  const postsResponse: PostsResponse = { result: { posts: posts.results, is_last: isLast } };
  return context.json(postsResponse, 200);
});
