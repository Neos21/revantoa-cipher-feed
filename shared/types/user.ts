/** 認証済みユーザ */
export type AuthUser = {
  /** ユーザ ID */
  id: number;
  /** ログインユーザ名 */
  name: string;
  /** 表示名 */
  display_name: string;
};
