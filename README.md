# CipherFeed

`https://cipher-feed.revantoa.workers.dev`

CipherFeed は、暗号化投稿の一連の処理を UI 上で確認できる SNS です。

投稿時は `Sign → Encrypt → Upload`、閲覧時は `Download → Decrypt → Verify` の流れを体験できます。


## コンセプト

このプロジェクトは、SNS 風の操作を通してクライアント側暗号処理を可視化することを目的にしています。

- ユーザは登録・ログイン後に鍵を生成し、公開鍵を登録して投稿できます
- 投稿データは暗号文としてサーバに保存され、閲覧時にクライアントで復号と署名検証を行います
- 鍵ローテーションを想定し `user_keys` テーブルで鍵履歴を保持します


## 暗号化モデルの位置づけ

このプロジェクトは「受信者公開鍵による秘匿通信」を目的にしていません。

- `client/crypto/pgp.ts` の `encryptMessage` / `decryptMessage` は `openpgp.encrypt({ passwords: [...] })` を利用しており、公開鍵文字列をパスワードとして扱う実装です
- そのため主眼は「第三者への秘匿性」ではなく「PGP 署名検証による改ざん検出」です
- ユーザ新規登録や鍵ローテーション時の運用複雑化、ユーザ増加時のバッチ再処理コストを避けるため、受信者公開鍵方式は現時点では採用しません

以上を前提として、CipherFeed は暗号処理の学習デモとして動作フローを可視化します。


## 技術スタック

- フロントエンド : React・React Router v7 (SPA モード)・ky・OpenPGP.js・TailwindCSS・daisyUI
- バックエンド : Cloudflare Workers・Hono
- データベース : Cloudflare D1 (SQLite)
- 開発環境 : TypeScript・Vite・ESLint・Wrangler


## 処理の流れ

### ユーザ登録・ログイン

1. `POST /api/users` で `name` と `password` を送信しユーザを作成する
2. `POST /api/auth/login` でログインし JWT を作成する
3. `GET /api/auth/check-token` でログイン状態を確認・復元する

サーバでは PBKDF2 (`SHA-256`・100000 Iterations) でパスワードハッシュを生成・検証します。

### 投稿までの流れ

1. クライアントで鍵ペアを生成し、秘密鍵を IndexedDB に保存する
2. `POST /api/users/:id/keys` で公開鍵を登録する
3. 投稿時に `payload` を作成し、秘密鍵で署名 (`signPayload`) する
4. `payload + signature` を JSON 化して暗号化 (`encryptMessage`) する
5. `POST /api/posts` に `user_id`・`user_key_id`・`ciphertext` を送信する

サーバは平文メッセージを扱わず、`posts.ciphertext` のみを保存します。

### 投稿を閲覧する際の流れ

1. `GET /api/posts` で投稿一覧を取得する
2. 投稿者ごとに `GET /api/users/:id/keys` を呼び、公開鍵を収集する
3. 投稿の `ciphertext` を復号 (`decryptMessage`) する
4. 復号結果の `payload` と `signature` を公開鍵で検証 (`verifySignature`) する
5. 検証成功時のみメッセージを表示し、失敗時は `Invalid` とする


## DB 定義

```sql
-- ユーザ
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ユーザ ID
  name           TEXT     NOT NULL,                    -- ログインユーザ名
  display_name   TEXT     NOT NULL,                    -- 表示名
  password_hash  TEXT     NOT NULL,                    -- パスワードハッシュ
  password_salt  TEXT     NOT NULL,                    -- ソルト
  created_at     TEXT     NOT NULL                     -- 作成日時 (UTC 文字列)
);

-- ログインユーザ名を一意に保つ
CREATE UNIQUE INDEX IF NOT EXISTS index_users_name ON users(name);

-- ユーザ公開鍵履歴
-- - 論理関係 : user_keys.user_id → users.id
CREATE TABLE IF NOT EXISTS user_keys (
  id           INTEGER  PRIMARY KEY  AUTOINCREMENT,                                    -- 鍵 ID
  user_id      INTEGER  NOT NULL,                                                      -- 所有ユーザ ID
  public_key   TEXT     NOT NULL,                                                      -- Armored 公開鍵
  fingerprint  TEXT     NOT NULL,                                                      -- フィンガープリント
  status       TEXT     NOT NULL  CHECK (status IN ('active', 'retired', 'revoked')),  -- 鍵ステータス
  created_at   TEXT     NOT NULL,                                                      -- 登録日時
  retired_at   TEXT                                                                    -- 退役日時
);

-- 1 ユーザにつき `active` 鍵は 1 つ
CREATE UNIQUE INDEX IF NOT EXISTS index_user_keys_active ON user_keys(user_id) WHERE status = 'active';

-- ユーザごとの鍵のソート用 Index
CREATE INDEX IF NOT EXISTS index_user_keys_user_id_created_at ON user_keys(user_id, created_at DESC);

-- 投稿
-- - 論理関係 : posts.user_id     → users.id
-- - 論理関係 : posts.user_key_id → user_keys.id
CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- 投稿 ID
  user_id      INTEGER  NOT NULL,                    -- 投稿者ユーザ ID
  user_key_id  INTEGER  NOT NULL,                    -- 投稿時に使った鍵 ID
  ciphertext   TEXT     NOT NULL,                    -- 暗号文
  created_at   TEXT     NOT NULL                     -- 投稿日時
);

-- 投稿順のソート Index
CREATE INDEX IF NOT EXISTS index_posts_created_at ON posts(created_at DESC);
```

- `user_keys.status` について、`retired` は「古くなった鍵」を意味するが、`revoked` は「無効化」したい場合を意味する
    - 鍵に関する情報が漏洩し、この鍵で署名されても意味がない場合などに、その鍵を `revoked` として表明する


## API エンドポイント一覧

| メソッド | パス                    | 概要                                                                |
|----------|-------------------------|---------------------------------------------------------------------|
| POST     | `/api/users`            | ユーザを作成する                                                    |
| GET      | `/api/users/:id/keys`   | 指定ユーザの公開鍵履歴を新しい順で返す                              |
| POST     | `/api/users/:id/keys`   | 認証済みユーザの公開鍵を登録し、既存 `active` 鍵を `retired` にする |
| POST     | `/api/auth/login`       | ログインして JWT を発行する                                         |
| GET      | `/api/auth/check-token` | JWT を検証してログイン状態を返す                                    |
| GET      | `/api/posts`            | 投稿一覧を新着順で返す                                              |
| POST     | `/api/posts`            | 認証済みユーザの暗号文投稿を保存する                                |


## ページ一覧

| パス      | 概要             |
|-----------|------------------|
| `/`       | トップページ     |
| `/signup` | ユーザ登録ページ |
| `/login`  | ログインページ   |


## 開発用コマンド

| npm-run-scripts  | 概要                                            |
|------------------|-------------------------------------------------|
| `dev`            | 開発サーバを起動する                            |
| `lint`           | ESLint を実行して自動修正する                   |
| `tsc`            | TypeScript 型チェックを実行する                 |
| `generate-types` | Wrangler 型生成と React Router 型生成を実行する |
| `build`          | 型生成と型チェック後にビルドする                |
| `preview`        | ビルド後に Wrangler でプレビュー起動する        |
| `deploy`         | ビルド後に Cloudflare へデプロイする            |

```bash
# DB を新規作成する
$ wrangler d1 create cipher-feed

# ローカルとリモートを指定して SQL を実行する
$ wrangler d1 execute cipher-feed --local  --command='SELECT * FROM users'
$ wrangler d1 execute cipher-feed --remote --command='SELECT * FROM users'
$ wrangler d1 execute cipher-feed --local  --file='./schema.sql'
$ wrangler d1 execute cipher-feed --remote --file='./schema.sql'

# インデックス一覧を確認する
$ wrangler d1 execute cipher-feed --local  --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
$ wrangler d1 execute cipher-feed --remote --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''

# シークレットを登録する
$ echo 'VALUE' | wrangler secret put JWT_SECRET --name cipher-feed
```


## AI エージェント向け指示

AI エージェントは `AGENTS.md` の内容に準拠したコードを生成すること。


## Links

- [Neo's World](https://neos21.net/)
