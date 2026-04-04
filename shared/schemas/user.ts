import { z } from 'zod';

/** ユーザ登録・ログイン時に使用するスキーマ */
export const signupLoginSchema = z.object({
  name    : z.preprocess(
              value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
              z.string('ユーザ名に文字列でないデータが入力されています')
                .min(4, 'ユーザ名は 4 文字以上で入力してください')
                .max(30, 'ユーザ名は 30 文字以下で入力してください')
                .regex(/^[a-z0-9-]+$/, 'ユーザ名は半角小文字の英数字とハイフンのみ使用できます')
            ),
  password: z.preprocess(
              value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
              z.string('パスワードに文字列でないデータが入力されています')
                .min(8, 'パスワードは 8 文字以上で入力してください')
                .max(50, 'パスワードは 50 文字以下で入力してください')
                .regex((/^[!-~]+$/i), 'パスワードは半角英数字と半角記号 (スペースを除く) のみ使用できます')
            )
});

/** ユーザ情報の更新に使用するスキーマ : 表示名のみ変更・パスワード変更と別々の UI だが同一 API で処理するため `optional` になっている */
export const userUpdateSchema = z.object({
  display_name    : z.preprocess(
                      value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
                      z.string('表示名に文字列でないデータが入力されています')
                        .min(1, '表示名は 1 文字以上で入力してください')
                        .max(50, '表示名は 50 文字以下で入力してください')
                    ).optional(),
  current_password: z.preprocess(
                      value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
                      z.string('現在のパスワードに文字列でないデータが入力されています')
                        .min(8, '現在のパスワードは 8 文字以上で入力してください')
                        .max(50, '現在のパスワードは 50 文字以下で入力してください')
                        .regex((/^[!-~]+$/i), '現在のパスワードは半角英数字と半角記号 (スペースを除く) のみ使用できます')
                    ).optional(),
  new_password    : z.preprocess(
                      value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
                      z.string('新しいパスワードに文字列でないデータが入力されています')
                        .min(8, '新しいパスワードは 8 文字以上で入力してください')
                        .max(50, '新しいパスワードは 50 文字以下で入力してください')
                        .regex((/^[!-~]+$/i), '新しいパスワードは半角英数字と半角記号 (スペースを除く) のみ使用できます')
                    ).optional()
});
