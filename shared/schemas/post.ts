import z from 'zod';

/** メッセージのスキーマ */
export const messageSchema = z.preprocess(
  value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
  z.string('メッセージに文字列でないデータが入力されています')
    .min(1, 'メッセージは 8 文字以上で入力してください')
    .max(500, 'メッセージは 500 文字以下で入力してください')
);
