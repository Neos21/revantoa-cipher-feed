import { useEffect, useState, type ReactNode } from 'react';

import { convertUtcToJst } from '../../../shared/helpers/convert-utc-to-jst';
import { wait } from '../../../shared/helpers/wait';

import type { PostItem } from './timeline';

const dummyCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/\\' as const;
const scrambleTextSpeedMs = 50 as const;

/** スロットマシンのように文字がパラパラ切り替わるコンポーネント */
const ScrambleText = ({ message, isDecrypted }: { message: string; isDecrypted: boolean; }): ReactNode => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    if(!isDecrypted) return;  // 復号が完了していなかったら何もしない
    
    let iteration = 0;
    const maxIterations = 20;
    
    setDisplayText(message.split('').map(c => c === ' ' || c === '\n' ? c : dummyCharacters[Math.floor(Math.random() * dummyCharacters.length)]).join(''));
    
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      setDisplayText(
        message.split('').map((char, index) => {
          if(char === ' ' || char === '\n') return char;
          if(index < (iteration / maxIterations) * message.length) return message[index];
          return dummyCharacters[Math.floor(Math.random() * dummyCharacters.length)];
        }).join('')
      );
      
      if(iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(message);
      }
      
      iteration += 1;
    }, scrambleTextSpeedMs);
    
    return (): void => clearInterval(interval);
  }, [isDecrypted, message]);
  
  return <span>{isDecrypted ? displayText : message}</span>;
};

/** タイムラインの 1 投稿 */
export const TimelineItem = ({ postItem }: { postItem: PostItem }): ReactNode => {
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  
  // `postItem` の状況が変わる度に再レンダリングされる
  const isError = ['Error', 'Invalid'].includes(postItem.verify);
  const placeholder = Array(15).fill(0).map(() => dummyCharacters[Math.floor(Math.random() * dummyCharacters.length)]).join('');
  
  useEffect(() => {
    (async () => {
      if(postItem.verify === 'Valid') {
        await wait(1500);
        setIsDecrypted(true);
      }
    })();
  }, [postItem.verify]);
  
  return (
    <div className="card border border-neutral py-3 px-4 bg-base-300 shadow-xl">
      <div className="flex gap-1 text-sm opacity-70">
        <div className="tooltip tooltip-right" data-tip={`#${postItem.id} : User ID #${postItem.userId}`}>
          {postItem.userDisplayName}
        </div>
        <div className="grow text-right whitespace-nowrap">{convertUtcToJst(postItem.createdAt)}</div>
      </div>
      
      <div className={`
        min-h-[3lh] mt-3 py-4 px-3 rounded-lg text-sm whitespace-pre-wrap bg-neutral/30 transition-colors duration-700
        ${isDecrypted            ? 'text-base-content'     : 'text-success animate-pulse'}
        ${isDecrypted && isError ? 'text-error opacity-50' : ''}
      `}>
        {!isDecrypted ? (
          `${placeholder} [復号中…]`
        ) : isError ? (
          postItem.message || '[ 復号・署名検証に失敗しました ]'
        ) : (
          <ScrambleText message={postItem.message} isDecrypted={isDecrypted} />
        )}
      </div>
      
      <div className="mt-3 flex flex-col sm:flex-row gap-y-2">
        <div className="min-w-[10em] whitespace-nowrap">
          {!isDecrypted ? (
            <span className="badge badge-outline gap-1 text-sm animate-pulse">
              <span className="loading loading-spinner loading-xs" />
              復号中…
            </span>
          ) : postItem.verify === 'Idle' ? (
            <span className="badge badge-warning gap-1 text-sm shadow-[0_0_8px_rgba(255,255,0,0.5)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
              </svg>
              署名検証中
            </span>
          ) : postItem.verify === 'Valid' ? (
            <span className="badge badge-success gap-1 text-sm shadow-[0_0_8px_rgba(0,255,128,0.5)] cursor-help">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              署名検証済
            </span>
          ) : (
            <span className="badge badge-error gap-1 text-sm shadow-[0_0_8px_rgba(255,0,0,0.5)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
              </svg>
              署名検証失敗
            </span>
          )}
        </div>
        
        <div className="flex flex-1 flex-wrap justify-end gap-y-1.5 gap-x-2 text-sm opacity-60">
          <span className="px-2 py-0.5 bg-base-200 rounded">暗号 : {postItem.encryption}</span>
          <span className="px-2 py-0.5 bg-base-200 rounded">署名 : {postItem.signatureAlgorithm}</span>
          <span className="px-2 py-0.5 bg-base-200 rounded">フィンガープリント : {postItem.fingerprint}</span>
        </div>
      </div>
      
      {isError && postItem.error != null && postItem.error !== '' && (
        <div className="mt-3 p-2 border border-error/20 rounded text-error text-sm bg-error/10">エラー : {postItem.error}</div>
      )}
    </div>
  );
};
