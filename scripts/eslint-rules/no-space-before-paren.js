export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: {
      unexpectedSpace: 'Unexpected space between \'{{keyword}}\' and \'(\'. Write \'{{keyword}}(\' with no space'
    },
    docs: {
      description: 'Enforce no space between if/else if/catch/for/switch/while keywords and \'(\'',
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
     * キーワードと括弧の間の空白を検査して必要なら修正する
     * 
     * @param node 報告対象ノード
     * @param keywordToken 対象キーワードトークン
     */
    const checkKeywordParen = (node, keywordToken) => {
      const nextToken = sourceCode.getTokenAfter(keywordToken);
      if(nextToken == null || nextToken.value !== '(') return;
      
      const keywordEnd = keywordToken.range[1];
      const parenStart = nextToken.range[0];
      
      // キーワード終端と `(` の開始位置が離れていれば空白あり
      if(keywordEnd < parenStart) {
        context.report({
          node,
          loc: {
            start: keywordToken.loc.end,
            end  : nextToken.loc.start
          },
          messageId: 'unexpectedSpace',
          data: { keyword: keywordToken.value },
          fix: (fixer) => {
            // キーワード直後から `(` の直前までを削除する
            return fixer.removeRange([keywordEnd, parenStart]);
          }
        });
      }
    };
    
    /**
     * if / else if の括弧前スペースを検査する
     * 
     * @param node IfStatement ノード
     */
    const handleIfStatement = (node) => {
      const ifToken = sourceCode.getFirstToken(node);
      checkKeywordParen(node, ifToken);
    };
    
    /**
     * for の括弧前スペースを検査する
     * 
     * @param node ForStatement ノード
     */
    const handleForStatement = (node) => {
      const forToken = sourceCode.getFirstToken(node);
      checkKeywordParen(node, forToken);
    };
    
    /**
     * for...of の括弧前スペースを検査する
     * 
     * @param node ForOfStatement ノード
     */
    const handleForOfStatement = (node) => {
      const forToken = sourceCode.getFirstToken(node);
      checkKeywordParen(node, forToken);
    };
    
    /**
     * for...in の括弧前スペースを検査する
     * 
     * @param node ForInStatement ノード
     */
    const handleForInStatement = (node) => {
      const forToken = sourceCode.getFirstToken(node);
      checkKeywordParen(node, forToken);
    };
    
    /**
     * switch の括弧前スペースを検査する
     * 
     * @param node SwitchStatement ノード
     */
    const handleSwitchStatement = (node) => {
      const switchToken = sourceCode.getFirstToken(node);
      checkKeywordParen(node, switchToken);
    };
    
    /**
     * catch の括弧前スペースを検査する
     * 
     * @param node CatchClause ノード
     */
    const handleCatchClause = (node) => {
      const catchToken = sourceCode.getFirstToken(node);
      checkKeywordParen(node, catchToken);
    };
    
    /**
     * while の括弧前スペースを検査する
     * 
     * @param node WhileStatement ノード
     */
    const handleWhileStatement = (node) => {
      const whileToken = sourceCode.getFirstToken(node);
      checkKeywordParen(node, whileToken);
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
     * do while の括弧前スペースを検査する
     * 
     * @param node DoWhileStatement ノード
     */
    const handleDoWhileStatement = (node) => {
      const whileToken = sourceCode.getTokenAfter(node.body, isWhileToken);
      if(whileToken == null) return;
      
      checkKeywordParen(node, whileToken);
    };
    
    return {
      // if(...) / else if(...)
      IfStatement: handleIfStatement,
      // for(...)
      ForStatement: handleForStatement,
      // for...of / for...in
      ForOfStatement: handleForOfStatement,
      ForInStatement: handleForInStatement,
      // switch(...)
      SwitchStatement: handleSwitchStatement,
      // catch(...)
      // TryStatement の handler (CatchClause) を使う
      CatchClause: handleCatchClause,
      // while(...)
      WhileStatement: handleWhileStatement,
      // do { } while(...)
      DoWhileStatement: handleDoWhileStatement
    };
  }
};
