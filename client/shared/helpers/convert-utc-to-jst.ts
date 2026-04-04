/** ISO 8601 形式の UTC 文字列を日本時間の `YYYY-MM-DD HH:mm:SS` や `YYYY-MM-DD` に変換する */
export const convertUtcToJst = (utcString: string | null | undefined, dateOnly: boolean = false): string => {
  // 値がおかしい場合はとりあえず `-` 表示にしておく
  if(utcString == null || utcString.trim() === '' || !(/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/).test(utcString)) return '-';
  
  // ISO 8601 (`YYYY-MM-DD HH:mm:SS`) から `YYYY-MM-DDTHH:mm:SSZ` に変換する
  const normalizedUtcString = `${utcString.replace(' ', 'T')}Z`;
  const utc = new Date(normalizedUtcString);
  const jst = new Date(utc.getTime() + ((new Date().getTimezoneOffset() + (9 /* Hours */ * 60 /* Minutes */)) * 60 /* Seconds */ * 1000 /* Milliseconds */));
  
  const year  = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, '0');
  const date  = String(jst.getDate()     ).padStart(2, '0');
  
  if(dateOnly) return `${year}-${month}-${date}`;
  
  const hours   = String(jst.getHours()  ).padStart(2, '0');
  const minutes = String(jst.getMinutes()).padStart(2, '0');
  const seconds = String(jst.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
};
