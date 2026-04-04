/** JWT ペイロード */
export type JwtPayload = {
  /** Subject : ユーザ ID */
  sub: number;
  /** ログインユーザ名 */
  name: string;
  /** 発行時刻 Epoch 秒 */
  iat: number;
  /** 失効時刻 Epoch 秒 */
  exp: number;
  /** JWT Issuer */
  iss: string;
};
