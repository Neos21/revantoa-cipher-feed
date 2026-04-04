import { HTTPError } from 'ky';

/**
 * HTTP エラーから API メッセージを抽出する
 * 
 * @param error 例外
 * @return エラーメッセージ
 */
export const extractHttpErrorMessage = async (error: unknown): Promise<string> => {
  if(error instanceof HTTPError) {
    try {
      const data = await error.response.json<{ error?: string; }>();
      return data.error ?? `${error.response.status}`;
    }
    catch {
      return `${error.response.status}`;
    }
  }
  if(error instanceof Error) return error.message;
  return '不明なエラー';
};
