# AGENTS.md

このリポジトリでの実装時に、このファイルのルールを必ず守ること。


## Purpose

This repository enforces **strict whitespace formatting rules**.

AI coding agents must generate code that **exactly matches the formatting defined in this document**.

Whitespace differences are considered **formatting errors**.

Agents MUST follow these rules when:

- generating new code
- editing existing code
- refactoring code
- inserting documentation comments


## コーディングスタイル

- 関数定義は `function` 宣言を禁止し `const` とアロー関数で記述する
- `export default` が必要な関数は `export default function hoge() {}` の記法を許可する
- 型定義と関数定義には日本語ドキュメンテーションコメントを必ず付ける
- 1 行で収まるドキュメンテーションコメントは `/**` と `*/` を同一行に記載する
- 複数行ドキュメンテーションコメントは `/**` で開始し次行から ` * ` 形式で記載する (ESLint ルールで強制済)
- 複数行ドキュメンテーションコメントの開始行は `/**` 単独行とし同じ行に説明文を書かない
- 複数行ドキュメンテーションコメントでは説明文とタグ行の間に ` * ` (スペース-アスタリスク-スペース) (つまり `<space>*<space>`) の空行を入れる (ESLint ルールで強制済)
- ドキュメンテーションコメントで日本語と English が隣接する場合は間に半角スペースを入れる
- ドキュメンテーションコメントの行末に句読点 `。` `、` を付けない
- 関数定義のドキュメンテーションコメントは体言止めを避け動詞で記述する
- 関数定義のドキュメンテーションコメントには、引数がある場合 `@param` を記載する
- 関数定義のドキュメンテーションコメントには、戻り値が `void`・`Promise<void>` 以外の場合 `@return` を記載する
- 関数定義のドキュメンテーションコメントには、明示的に `throw` を呼び出しているか、標準 API の例外スローを利用している場合 `@throws` で例外が発生する場合を記載する
- 型定義のオブジェクトプロパティには各項目のドキュメンテーションコメントを記載する
- 配列型は `string[]` を使わず `Array<string>` 形式で記載する
- `if` `for` `catch` `switch` などの予約語と括弧の間にスペースを入れない (ESLint ルールで強制済)
- `else if` `else` `catch` `finally` の直前は必ず改行し `} else if()` の形式を禁止する (ESLint ルールで強制済)
- 文字列表現はシングルクォートを基本とし変数合成や改行時のみバッククォートを使う
- ダブルクォート文字列は使用しない
- TSX 内の HTML 属性値を囲む箇所のみダブルクォートを許可する
- 定数宣言はスモールキャメルケースとし、大文字スネークケースは使わない


## 空行とインデントスペースに関するルール

- **トップレベル要素同士の区切り空行**は完全空行 (スペースなし) とする (ESLint ルールで強制済)
- **関数・制御文内のコードブロック内の空行**は、そのブロック内の実行文と同じインデントレベルで記載する (ESLint ルールで強制済)
    - 例 : `if` 文内の複数ステートメント間の空行は、`if` 文の本体と同じインデントを使用
    - 例 : TSX 要素内の空行は、TSX 要素の内容と同じインデントを使用


## Truthy / Falsy による暗黙判定の禁止

文字列・オブジェクト・配列などの値の有無を判定する際に、JavaScript の Truthy・Falsy への暗黙的な型変換に依存した書き方を禁止する。

以下のような書き方は禁止します。

```js
if(someString) { ... }
if(!obj) return;
````

これらは `''`、`0`、`false`、`null`、`undefined` などが同一視されてしまい、意図が不明確になります。

値の判定は、`null`・`undefined` かどうか、または空文字かどうかを明示的に記述してください。

例 :

```js
if(someString != null && someString !== '') { ... }
if(obj == null) return;
```

`null` との曖昧等価比較 `== null` は、`null` と `undefined` の両方を判定する意図的な使用として許可します。


---


## Important Notation

Whitespace is shown using visible markers.

| Symbol | Meaning         |
|--------|-----------------|
| `␠`   | space character |
| `⏎`   | newline         |

Example:

```
␠*␠
```

means

```
(space)(asterisk)(space)
```


## Rule 1 — Multi-Line Documentation Comment Format

All multi-line documentation comments MUST follow this structure.

```
/**
␠*␠Description line
␠*␠
␠*␠@tag value
␠*/
```

Important structural rules:

### 1. Opening delimiter

The opening delimiter MUST be on its own line.

Correct:

```
/**
```

Incorrect:

```
/** Description
```

### 2. Comment line prefix

Every line inside the comment MUST begin with

```
␠*␠
```

This means:

```
(space)(asterisk)(space)
```

### 3. Mandatory separator line

There MUST be **exactly one separator line** between description text and tag lines.

The separator line MUST be written as:

```
␠*␠
```

Important:

This line contains a **trailing space**.

Structure:

```
(space)(asterisk)(space)(newline)
```

### Correct Example

```
/**
␠*␠Fetch user information
␠*␠
␠*␠@param id user id
␠*␠@returns user object
␠*/
```

### Incorrect Examples

Missing separator line:

```
/**
␠*␠Fetch user
␠*␠@param id
␠*/
```

Separator without trailing space:

```
/**
␠*␠Fetch user
␠*
␠*␠@param id
␠*/
```

Empty line instead of comment line:

```
/**
␠*␠Fetch user

␠*␠@param id
␠*/
```


## Rule 2 — Blank Line Formatting

Two types of blank lines exist.

Agents MUST apply the correct rule depending on context.

### Rule 2.1 — Blank Lines Inside Code Blocks

Inside blocks, blank lines MUST contain **indentation spaces only**.

Example with 2-space indentation:

```
function example() {
␠␠const a = 1
␠␠
␠␠const b = 2
}
```

The blank line contains:

```
␠␠
```

Important:

The blank line MUST NOT be completely empty.

Incorrect:

```
function example() {
␠␠const a = 1

␠␠const b = 2
}
```

### Rule 2.2 — Blank Lines Between Top-Level Elements

Blank lines between top-level elements MUST be **completely empty**.

Example:

```
function a() {}

function b() {}
```

The separator line must contain:

```
⏎
```

(no spaces)

Incorrect:

```
function a() {}
␠
function b() {}
```


## Summary Table

| Context               | Required Blank Line |
|-----------------------|---------------------|
| Inside code block     | indentation spaces  |
| Top-level separation  | completely empty    |
| Doc comment separator | `␠*␠`             |


## Required Generation Template

Agents SHOULD follow this template when creating documentation comments.

```
/**
␠*␠<description>
␠*␠
␠*␠@param ...
␠*␠@returns ...
␠*/
```


## Agent Self-Verification (MANDATORY)

Before finalizing output, the agent MUST verify:

### Documentation comments

Check that every multi-line comment contains

```
␠*␠
```

as the separator line.

Ensure that the line contains a **trailing space**.

### Code blank lines

Check that:

- blank lines inside blocks contain indentation spaces
- top-level blank lines contain no spaces

If any rule is violated, the agent MUST correct the code before output.


## Fully Compliant Example

```
/**
␠*␠Fetch user
␠*␠
␠*␠@param id user id
␠*␠@returns user object
␠*/
export const getUser = async (id: string): User => {
␠␠const user = await repo.find(id);
␠␠
␠␠if(user == null) {
␠␠␠␠alert('User Not Found');
␠␠␠␠
␠␠␠␠return null;
␠␠}
␠␠
␠␠return user;
};

export const helper = (): number => {
␠␠const a = 1;
␠␠
␠␠const b = 2;
␠␠
␠␠return a + b;
};
```


## Important

Do NOT:

- trim trailing spaces in documentation separator lines
- normalize blank lines
- remove indentation spaces from blank lines

Whitespace is **part of the required formatting**.


---


## Naming

- ファイル名は小文字のみのハイフンケースにする


## Final Check

- コーディング終了時は `npm run lint`・`npm run tsc` が成功すること
- 変更した TS・TSX は `nl -ba` で確認し `catch` の先頭インデント欠落がないことを目視確認する
- 変更した TS・TSX は**コードブロック内の空行がそのブロックのインデントレベルを持つ**ことを目視確認する (ESLint ルールで強制済)
    - 以下のコマンドで確認 : `nl -ba <file>`
    - コードブロック内の空行 (制御文や関数内) は、その行のインデントレベルに対応したスペースを持つか確認
- ドキュメンテーションコメント内の空行が ` * ` 形式 (スペース-アスタリスク-スペース `<space>*<space>`) になっていることを目視確認する (ESLint ルールで強制済)
    - 説明文とタグ行の間は必ず ` * ` (スペース-アスタリスク-スペース `<space>*<space>`) で記載 (完全空行や不完全な形式は不可)
