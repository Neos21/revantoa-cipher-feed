import { Hono } from 'hono';

import { authApi, authApiBasePath } from './routes/auth/auth';
import { postsApi, postsApiBasePath } from './routes/posts/posts';
import { usersApi, usersApiBasePath } from './routes/users/users';

import type { HonoBindings } from './shared/types/hono-bindings';

const app = new Hono<{ Bindings: HonoBindings; }>();

const api = new Hono<{ Bindings: HonoBindings; }>();
const apiBasePath = '/api';

api.route(authApiBasePath , authApi);
api.route(usersApiBasePath, usersApi);
api.route(postsApiBasePath, postsApi);

app.route(apiBasePath, api);
export default app;
