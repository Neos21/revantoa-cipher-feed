/**
 * バイト列を Base64 に変換する
 * 
 * @param bytes 変換対象
 * @return Base64 文字列
 */
export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for(const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
