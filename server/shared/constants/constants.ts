/** PBKDF2 の反復回数 (Cloudflare Workers の限界値が 100000 のためこの値を使用する) */
export const passwordPbkdf2Iterations = 100_000 as const;

/** JWT の有効期限 (秒) : `60 * 60 * 24 * 7` で7日間 */
export const jwtDurationSeconds = 604_800 as const;

/** JWT の Issuer */
export const jwtIssuer = 'cipher-feed-issuer' as const;
