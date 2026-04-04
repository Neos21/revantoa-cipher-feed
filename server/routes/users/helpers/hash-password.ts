import { bytesToBase64 } from '../../../../shared/helpers/bytes-to-base64';
import { derivePasswordHash } from '../../../shared/helpers/derive-password-hash';

/**
 * Web Crypto API でパスワードハッシュを生成する
 * 
 * @param password 平文パスワード
 * @return ハッシュとソルト
 */
export const hashPassword = async (password: string): Promise<{ hash: string; salt: string }> => {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashBytes = await derivePasswordHash(password, saltBytes);
  
  return {
    hash: bytesToBase64(hashBytes),
    salt: bytesToBase64(saltBytes)
  };
};
