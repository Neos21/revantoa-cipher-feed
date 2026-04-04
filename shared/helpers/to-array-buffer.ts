/**
 * バイト列を ArrayBuffer に複製変換する
 * 
 * @param bytes 変換対象
 * @return ArrayBuffer
 */
export const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
};
