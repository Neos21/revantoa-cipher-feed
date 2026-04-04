import type { Post } from './post';
import type { AuthUser } from './user';
import type { UserKey } from './user-key';

/** `/api/auth/login` ログインリクエスト */
export type AuthLoginRequest = {
  /** ログインユーザ名 */
  name: string;
  /** パスワード */
  password: string;
};

/** `/api/auth/login` ログインレスポンス */
export type AuthLoginResponse = {
  result: {
    /** JWT */
    token: string;
    /** ログインユーザ */
    user: AuthUser;
  };
};

/** `/api/auth/check-token` JWT チェックレスポンス */
export type AuthCheckTokenResponse = {
  result: {
    /** 認証済みか否か */
    is_authenticated: boolean;
    /** 認証済みユーザ (認証済でない場合は `undefined`) */
    user?: AuthUser;
  };
};

/** `/api/users` ユーザ登録リクエスト */
export type UserCreateRequest = {
  /** ユーザ名 */
  name: string;
  /** パスワード */
  password: string;
};

/** `/api/users` ユーザ登録レスポンス */
export type UserCreateResponse = {
  result: {
    /** 作成されたユーザ ID */
    id: number;
  };
};

/** `/api/users/:id/keys` ユーザキー登録リクエスト */
export type UserKeyCreateRequest = {
  /** ユーザ ID */
  user_id: number;
  /** 公開鍵 */
  public_key: string;
  /** フィンガープリント */
  fingerprint: string;
};

/** `/api/users/:id/keys` ユーザキー登録レスポンス */
export type UserKeyCreateResponse = {
  result: {
    /** 作成されたユーザ鍵 ID */
    id: number;
  };
};

/** `/api/users/:id/keys` ユーザキー一覧レスポンス */
export type UserKeysResponse = {
  result: Array<UserKey>;
};

/** `/api/posts` 投稿作成リクエスト */
export type PostCreateRequest = {
  /** ユーザ ID */
  user_id: number;
  /** ユーザ鍵 ID */
  user_key_id: number;
  /** 暗号文 */
  ciphertext: string;
};

/** `/api/posts` 投稿作成レスポンス */
export type PostCreateResponse = {
  result: {
    /** 作成された投稿 ID */
    id: number;
  };
};

/** `/api/posts` 投稿一覧レスポンス */
export type PostsResponse = {
  result: {
    /** 投稿一覧 */
    posts: Array<Post>;
    /** 最後のページか否か */
    is_last: boolean;
  };
};

/** `/api/users/me` ユーザ更新リクエスト */
export type UserUpdateRequest = {
  /** 表示名 (任意) */
  display_name?: string;
  /** 現在のパスワード (パスワード変更時に必須) */
  current_password?: string;
  /** 新しいパスワード (パスワード変更時に必須) */
  new_password?: string;
};

/** `/api/users/me` ユーザ更新レスポンス */
export type UserUpdateResponse = {
  result: {
    /** 更新されたユーザ ID */
    id: number;
    /** 更新された表示名 */
    display_name: string;
  };
};
