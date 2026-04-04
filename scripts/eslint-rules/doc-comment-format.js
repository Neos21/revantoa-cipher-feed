export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace'
  },
  
  /**
   * ESLint context を受け取り visitor を返す
   * 
   * @param context ESLint context
   * @return visitor 定義
   */
  create: (context) => {
    const source = context.getSourceCode();
    
    return {
      /**
       * Program ノードからドキュメンテーションコメントを検査する
       */
      Program: () => {
        const comments = source.getAllComments();
        for(const comment of comments) {
          if(comment.type !== 'Block') continue;
          if(!source.getText(comment).startsWith('/**')) continue;
          
          const text = source.getText(comment);
          const lines = text.split('\n');
          
          let tagLine = -1;
          for(let i = 0; i < lines.length; i++) {
            if((/@\w+/).test(lines[i])) {  // `@param` などがあるか否かで修正するべきか判断している
              tagLine = i;
              break;
            }
          }
          if(tagLine === -1) continue;
          
          const separator = lines[tagLine - 1];
          if(separator.endsWith(' * ')) continue;
          
          // 何個のスペースを入れたら良いか調べる
          const targetIndent = lines[1].match((/^\s+/g))?.[0]?.length ?? 0;
          
          context.report({
            loc: comment.loc,  // NOTE : `/**` の行番号が出ているので単純にいえば行番号は `+ 2` されて欲しいのだがまぁいいか…
            message: 'Doc comment separator must be ` * `',
            fix: (fixer) => {
              const fixed = lines
                .map((l, i) => (i === tagLine - 1 ? ' '.repeat(targetIndent) + '* ' : l))
                .join('\n');
              return fixer.replaceText(comment, fixed);
            }
          });
        }
      }
    };
  }
};
