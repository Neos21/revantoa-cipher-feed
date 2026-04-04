import { stringToBytes } from './string-to-bytes';
import { toArrayBuffer } from '../../../shared/helpers/to-array-buffer';
import { passwordPbkdf2Iterations } from '../constants/constants';

/**
 * Web Crypto API で PBKDF2 を使用しハッシュを導出する
 * 
 * @param password 平文パスワード
 * @param saltBytes ソルト
 * @return 導出ハッシュ
 */
export const derivePasswordHash = async (password: string, saltBytes: Uint8Array): Promise<Uint8Array> => {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(stringToBytes(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(saltBytes),
      iterations: passwordPbkdf2Iterations
    },
    passwordKey,
    256
  );
  
  return new Uint8Array(derivedBits);
};
