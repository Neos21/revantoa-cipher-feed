import { base64ToBytes } from '../../../../shared/helpers/base64-to-bytes';
import { constantTimeEqual } from '../../../shared/helpers/constant-time-equal';
import { derivePasswordHash } from '../../../shared/helpers/derive-password-hash';

/**
 * パスワードを検証する (Web Crypto API を使用している)
 * 
 * @param password 平文パスワード
 * @param expectedHash 期待ハッシュ
 * @param salt ソルト
 * @return 検証できたか否か
 */
export const verifyPassword = async (password: string, expectedHash: string, salt: string): Promise<boolean> => {
  const saltBytes = base64ToBytes(salt);
  const expectedHashBytes = base64ToBytes(expectedHash);
  const actualHashBytes = await derivePasswordHash(password, saltBytes);
  return constantTimeEqual(actualHashBytes, expectedHashBytes);
};
