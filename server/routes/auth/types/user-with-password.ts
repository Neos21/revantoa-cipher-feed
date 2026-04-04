import type { AuthUser } from '../../../../shared/types/user';

/** パスワード情報を持つユーザ定義 */
export type UserWithPassword = AuthUser & {
  /** パスワードハッシュ */
  password_hash: string;
  /** ソルト */
  password_salt: string;
};
