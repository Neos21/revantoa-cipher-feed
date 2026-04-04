/**
 * 空行にその行が属するブロックのインデント深さに合わせたスペースを強制するルール
 * 
 * 判定ロジック :
 * 1. 空行 (スペースのみ or 完全に空) を検出する
 * 2. 前後の非空行を探して、そのうち「浅い方」のインデントを期待値とする
 * 3. ただし、テンプレートリテラル内の行はスキップする (内容を変えない)
 * 4. ブロック外 (トップレベル) の空行はスペースなし
 */
export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          indentSize: {
            type: 'integer',
            minimum: 1,
            default: 2
          },
          indentType: {
            enum: ['space', 'tab'],
            default: 'space'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      missingIndent: '空行には {{expected}} 個のスペースが必要です (現在: {{actual}} 個)'
    },
    docs: {
      description: '空行にその行が属するブロックのインデント深さに合わせたスペースを入れる',
      recommended: false
    }
  },
  
  /**
   * ESLint context を受け取り visitor を返す
   * 
   * @param context ESLint context
   * @return visitor 定義
   */
  create: (context) => {
    const options = context.options[0] ?? {};
    const indentChar = (options.indentType ?? 'space') === 'tab' ? '\t' : ' ';
    
    // ソーステキスト全体を行に分割して処理する
    // AST ノードベースではなくテキストベースで処理するのが最も確実
    return {
      /**
       * Program ノードから空行を検査する
       * 
       * @param node Program ノード
       */
      Program: (node) => {
        /** テンプレートリテラル内の行番号セットを構築する (1-indexed) */
        const buildTemplateLiteralLineSet = (programNode) => {
          const set = new Set();
          
          /**
           * AST ノードを再帰的に走査する
           * 
           * @param node 対象ノード
           */
          const walk = (node) => {
            if(node == null || typeof node !== 'object') return;
            
            if(node.type === 'TemplateLiteral') {
              const start = node.loc.start.line;
              const end = node.loc.end.line;
              // 複数行にまたがる場合のみ、内部行 (start+1 〜 end-1) をマークする
              // 開始行 (start)・終了行 (end) はコードが書かれている行なので除外する
              if(start !== end) {
                for(let l = start + 1; l <= end - 1; l++) set.add(l);
              }
            }
            
            for(const key of Object.keys(node)) {
              if(key === 'parent') continue;
              
              const child = node[key];
              if(Array.isArray(child)) {
                for(const item of child) walk(item);
              }
              else if(child != null && typeof child === 'object' && child.type != null) {
                walk(child);
              }
            }
          };
          
          walk(programNode);
          return set;
        };
        
        /** `index` より前の非空行 (テンプレートリテラル外) を探す */
        const findPrevNonBlank = (lines, index, templateLiteralLines) => {
          for(let i = index - 1; i >= 0; i--) {
            const lineNumber = i + 1;
            if(templateLiteralLines.has(lineNumber)) continue;
            if(!(/^\s*$/).test(lines[i])) return lines[i];
          }
          return null;
        };
        
        /** `index` より後の非空行 (テンプレートリテラル外) を探す */
        const findNextNonBlank = (lines, index, templateLiteralLines) => {
          for(let i = index + 1; i < lines.length; i++) {
            const lineNumber = i + 1;
            if(templateLiteralLines.has(lineNumber)) continue;
            if(!(/^\s*$/).test(lines[i])) return lines[i];
          }
          return null;
        };
        
        /** 行のインデント文字数を返す */
        const getIndentCount = (line, indentChar) => {
          let count = 0;
          for(const character of line) {
            if(character === indentChar) count++;
            else break;
          }
          return count;
        };
        
        /**
         * 空行の期待インデントを前後の非空行から計算する
         * 
         * ロジック :
         * - 直前の非空行のインデント深さ (prevIndent)
         * - 直後の非空行のインデント深さ (nextIndent)
         * - 期待値 = min(prevIndent, nextIndent)
         *   ただし nextIndent が prevIndent より小さければ次の行の閉じブレースを考慮し nextIndent を使う (そのブロックから抜け出す空行)
         * 
         * @param lines ソースコード行配列
         * @param blankLineIndex 空行の行番号 (0-indexed)
         * @param templateLiteralLines テンプレートリテラルの行番号セット
         * @param indentChar インデント文字
         * @return 期待インデント文字列
         */
        const computeExpectedIndent = (lines, blankLineIndex, templateLiteralLines, indentChar) => {
          const prevLine = findPrevNonBlank(lines, blankLineIndex, templateLiteralLines);
          const nextLine = findNextNonBlank(lines, blankLineIndex, templateLiteralLines);
          if(prevLine == null && nextLine == null) return '';
          
          const prevIndent = prevLine != null ? getIndentCount(prevLine, indentChar) : 0;
          const nextIndent = nextLine != null ? getIndentCount(nextLine, indentChar) : 0;
          
          // 次の行が閉じブレース/ブラケットで始まる場合は、その行のインデントを使う
          // そうでなければ min を使う
          const nextTrimmed = nextLine != null ? nextLine.trimStart() : '';
          const isClosingLine = (/^[}\])]/).test(nextTrimmed);
          
          let expectedCount;
          if(isClosingLine) {
            // 閉じ記号の前の空行は、閉じ記号のインデント = prevIndent - 1段階相当
            // ただし nextIndent が実際の期待値
            expectedCount = nextIndent;
          }
          else {
            expectedCount = Math.min(prevIndent, nextIndent);
          }
          
          return indentChar.repeat(expectedCount);
        };
        
        /** テキスト全体の中で i 行目 (0-indexed) の開始バイト位置を返す */
        const getLineStart = (text, lineIndex) => {
          let position = 0;
          for(let i = 0; i < lineIndex; i++) {
            const nl = text.indexOf('\n', position);
            if(nl === -1) return text.length;
            position = nl + 1;
          }
          return position;
        };
        
        const sourceCode = context.getSourceCode != null ? context.getSourceCode() : context.sourceCode;
        const text = sourceCode.getText();
        const lines = text.split('\n');
        
        // テンプレートリテラル内の行番号セットを事前に構築する (1-indexed)
        const templateLiteralLines = buildTemplateLiteralLineSet(node);
        
        for(let i = 0; i < lines.length; i++) {
          const lineNumber = i + 1;  // 1-indexed
          const line = lines[i];
          
          // 空行判定 : スペース・タブのみの行 or 完全な空行
          const isBlankLine = (/^\s*$/).test(line);
          if(!isBlankLine) continue;
          
          // テンプレートリテラル内はスキップする
          if(templateLiteralLines.has(lineNumber)) continue;
          
          // 期待インデントを計算する
          const expectedIndent = computeExpectedIndent(lines, i, templateLiteralLines, indentChar);
          
          const currentIndent = line;  // 空行なのでそのものがインデント文字列
          const currentLength = currentIndent.length;
          const expectedLength = expectedIndent.length;
          
          if(currentLength !== expectedLength) {
            // 行の開始位置を特定してレポートする
            const lineStart = getLineStart(text, i);
            context.report({
              loc: {
                start: { line: lineNumber, column: 0 },
                end  : { line: lineNumber, column: currentLength }
              },
              messageId: 'missingIndent',
              data: {
                expected: expectedLength,
                actual  : currentLength
              },
              fix: (fixer) => {
                // 行全体 (インデント部分) を置換する
                return fixer.replaceTextRange([lineStart, lineStart + currentLength], expectedIndent);
              }
            });
          }
        }
      }
    };
  }
};
