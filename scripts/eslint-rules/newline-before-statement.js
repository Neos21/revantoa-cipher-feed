export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: {
      expectedNewline: 'Expected newline before \'{{keyword}}\'. Put \'{{keyword}}\' on its own line'
    },
    docs: {
      description: 'Enforce newline before else / else if / catch / finally / while keywords',
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
    const sourceCode = context.getSourceCode();
    
    /**
     * あるノードが始まっている行の行頭インデント文字列を返す
     * 
     * @param node 対象ノード
     * @return インデント文字列
     */
    const getIndentOf = (node) => {
      const line = sourceCode.lines[node.loc.start.line - 1] ?? '';
      const match = line.match((/^(\s*)/));
      return match ? match[1] : '';
    };
    
    /**
     * keywordToken の直前が同一行かどうかを確認し必要なら改行を追加する
     * 
     * @param node 報告対象ノード
     * @param keywordToken 対象キーワードトークン
     * @param ownerNode インデント基準ノード
     */
    const checkNewlineBefore = (node, keywordToken, ownerNode) => {
      const tokenBefore = sourceCode.getTokenBefore(keywordToken);
      if(tokenBefore == null) return;
      
      // 直前トークンと keyword が同じ行にある場合のみエラー
      if(tokenBefore.loc.end.line === keywordToken.loc.start.line) {
        // 対応する if / try / do の行頭インデントを使う
        const indent = getIndentOf(ownerNode);
        context.report({
          node,
          loc: keywordToken.loc,
          messageId: 'expectedNewline',
          data: { keyword: keywordToken.value },
          fix: (fixer) => {
            // 直前トークン終端 〜 keyword 開始位置を '\n<indent>' に置換する
            return fixer.replaceTextRange([tokenBefore.range[1], keywordToken.range[0]], '\n' + indent);
          }
        });
      }
    };
    
    /**
     * else if の改行位置を検査する
     * 
     * @param node IfStatement ノード
     */
    const handleIfStatement = (node) => {
      // この IfStatement が別の IfStatement の 'alternate' (= else if / else) か？
      // そうであれば、親から見た 'else' キーワードを検査する
      const parent = node.parent;
      if(parent != null && parent.type === 'IfStatement' && parent.alternate === node) {
        // `else` トークンを取得 (consequent の直後にある)
        const elseToken = sourceCode.getTokenBefore(node);
        if(elseToken != null && elseToken.value === 'else') {
          // インデント基準はルート if (チェーンを遡る)
          let root = parent;
          while(root.parent != null && root.parent.type === 'IfStatement' && root.parent.alternate === root) {
            root = root.parent;
          }
          checkNewlineBefore(node, elseToken, root);
        }
      }
    };
    
    /**
     * else の改行位置を検査する
     * 
     * @param node IfStatement ノード
     */
    const handleIfStatementExit = (node) => {
      if(node.alternate == null) return;
      // alternate が IfStatement のときは上の IfStatement ハンドラで処理済み
      if(node.alternate.type === 'IfStatement') return;
      
      // `else` トークンを取得
      const elseToken = sourceCode.getTokenBefore(node.alternate);
      if(elseToken != null && elseToken.value === 'else') {
        checkNewlineBefore(node.alternate, elseToken, node);
      }
    };
    
    /**
     * catch の改行位置を検査する
     * 
     * @param node CatchClause ノード
     */
    const handleCatchClause = (node) => {
      const catchToken = sourceCode.getFirstToken(node);
      // インデント基準は親の TryStatement
      if(catchToken != null && catchToken.value === 'catch') {
        checkNewlineBefore(node, catchToken, node.parent);
      }
    };
    
    /**
     * finally の改行位置を検査する
     * 
     * @param node TryStatement ノード
     */
    const handleTryStatement = (node) => {
      if(node.finalizer == null) return;
      const finallyToken = sourceCode.getTokenBefore(node.finalizer);
      if(finallyToken != null && finallyToken.value === 'finally') {
        checkNewlineBefore(node.finalizer, finallyToken, node);
      }
    };
    
    /**
     * while トークンかどうか判定する
     * 
     * @param token 対象トークン
     * @return 判定結果
     */
    const isWhileToken = (token) => {
      return token.value === 'while';
    };
    
    /**
     * do while の改行位置を検査する
     * 
     * @param node DoWhileStatement ノード
     */
    const handleDoWhileStatement = (node) => {
      const whileToken = sourceCode.getTokenAfter(node.body, isWhileToken);
      if(whileToken != null) checkNewlineBefore(node, whileToken, node);
    };
    
    return {
      // if / else if / else
      IfStatement: handleIfStatement,
      // else (非 IfStatement の alternate)
      // alternate が BlockStatement や ExpressionStatement の場合
      'IfStatement:exit': handleIfStatementExit,
      // catch
      CatchClause: handleCatchClause,
      // finally
      TryStatement: handleTryStatement,
      // do while
      DoWhileStatement: handleDoWhileStatement
    };
  }
};
