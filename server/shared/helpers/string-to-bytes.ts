/**
 * 文字列を UTF-8 バイト列に変換する
 * 
 * @param value 変換対象
 * @return UTF-8 バイト列
 */
export const stringToBytes = (value: string): Uint8Array => new TextEncoder().encode(value);
