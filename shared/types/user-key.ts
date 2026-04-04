/** ユーザ公開鍵履歴の 1 件 */
export type UserKey = {
  /** 鍵 ID */
  id: number;
  /** Armored 公開鍵 */
  public_key: string;
  /** フィンガープリント */
  fingerprint: string;
  /** 鍵ステータス : `active` が最新 1 件・過去の鍵は `retired` だが使用可能・`revoked` は現状実装には登場しないが「その鍵で署名されたものを無効とする」ような破棄・廃止した鍵に使用する */
  status: 'active' | 'retired' | 'revoked';
};
