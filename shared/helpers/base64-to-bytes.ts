/**
 * Base64 をバイト列に変換する
 * 
 * @param base64 変換対象
 * @return バイト列
 */
export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};
