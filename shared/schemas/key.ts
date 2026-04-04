import z from 'zod';

/** パスフレーズのスキーマ */
export const passphraseSchema = z.preprocess(
  value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
  z.string('パスフレーズに文字列でないデータが入力されています')
    .min(8, 'パスフレーズは 8 文字以上で入力してください')
    .regex((/^[!-~]+$/i), 'パスフレーズは半角英数字と半角記号 (スペースを除く) のみ使用できます')
);
