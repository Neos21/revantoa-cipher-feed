/**
 * `YYYY-MM-DD HH:mm:SS` 形式の UTC 文字列を生成する
 * 
 * @param date 変換対象
 * @return `YYYY-MM-DD HH:mm:SS` 形式の UTC 文字列
 */
export const formatUtcTimestamp = (date: Date): string => {
  const year    = date.getUTCFullYear();
  const month   = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day     = String(date.getUTCDate()     ).padStart(2, '0');
  const hours   = String(date.getUTCHours()    ).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()  ).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()  ).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
