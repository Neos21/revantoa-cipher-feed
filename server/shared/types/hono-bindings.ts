/**  Hono バインディング */
export type HonoBindings = {
  /** D1 Database */
  DB: D1Database;
  /** JWT 署名用シークレット */
  JWT_SECRET: string;
};
