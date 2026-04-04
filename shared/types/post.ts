/** 投稿 1 件 */
export type Post = {
  /** 投稿 ID */
  id: number;
  /** 投稿者ユーザ ID */
  user_id: number;
  /** 投稿時の公開鍵 ID */
  user_key_id: number;
  /** 暗号文 */
  ciphertext: string;
  /** 投稿日時 */
  created_at: string;
  
  /** 表示名 (`users` と結合して取得する) */
  display_name: string;
};
