import ky from 'ky';
import { useEffect, useState, type ReactNode } from 'react';

import { TimelineItem } from './timeline-item';
import { decryptMessage, inspectCryptoSuite, verifySignature } from '../../../shared/helpers/pgp';
import { arrowStyle, getIconWrapperStyle, getStepStyle, iconWrapperStyle, runningStyle, stepStyle } from '../../../shared/helpers/status-icon-style';
import { wait } from '../../../shared/helpers/wait';
import { useTimelineReloadStore } from '../../../shared/stores/timeline-reload-store';
import { useUserStore } from '../../../shared/stores/user-store';

import type { PostsResponse, UserKeysResponse } from '../../../../shared/types/api';
import type { UserKey } from '../../../../shared/types/user-key';
import type { FlowStepStatus } from '../../../shared/types/flow-step-status';
import type { PostEnvelope } from '../../../shared/types/post-envelope';

/** タイムラインフローのステータス */
type Flow = {
  /** 受信 */
  download   : FlowStepStatus;
  /** 復号 */
  decrypt    : FlowStepStatus;
  /** 署名検証 */
  verify     : FlowStepStatus;
  /** 全件の処理が完了したか否か : 「再読込」ボタンの活性化・一覧の表示メッセージ調整に使用する */
  isCompleted: boolean;
};

/** 投稿 1 件 (子コンポーネントも型を参照する) */
export type PostItem = {
  /** 投稿 ID */
  id                : number;
  /** 投稿日時 */
  createdAt         : string;
  /** 投稿ユーザ ID */
  userId            : number;
  /** 投稿ユーザ表示名 */
  userDisplayName   : string;
  /** 投稿ユーザ鍵 ID */
  userKeyId         : number;
  /** フィンガープリント */
  fingerprint       : string;
  /** 暗号方式 */
  encryption        : string;
  /** 署名方式 */
  signatureAlgorithm: string;
  /** メッセージ平文 */
  message           : string;
  /** 検証結果ステータス */
  verify            : 'Valid' | 'Invalid' | 'Error' | 'Idle';
  /** エラー時のメッセージ */
  error?            : string;
};

/** タイムライン */
export const Timeline = (): ReactNode => {
  const {
    // State : API 上は JWT 認証をしていないがログインユーザのみが閲覧できるように確定させるため JWT 確認をココでしておく
    isCheckingToken
  } = useUserStore();
  const { timelineReload } = useTimelineReloadStore();
  
  const [flow  , setFlow  ] = useState<Flow>({ download: 'Idle', decrypt: 'Idle', verify: 'Idle', isCompleted: false });
  const [posts , setPosts ] = useState<Array<PostItem>>([]);
  const [isLast, setIsLast] = useState<boolean>(false);
  
  /**
   * 投稿一覧を取得して復号する
   * 
   * @param lastId さらに表示時に使用する最後の投稿 ID
   */
  const onLoadPosts = async (lastId: number | null = null): Promise<void> => {
    setFlow({ download: 'Running', decrypt: 'Idle', verify: 'Idle', isCompleted: false });
    
    try {
      const requestUrl = lastId == null ? '/api/posts' : `/api/posts?last_id=${lastId}`;
      const postsResponse = await ky.get(requestUrl).json<PostsResponse>();
      
      const responsePosts = postsResponse.result.posts;
      const filteredPosts = lastId == null ? responsePosts : responsePosts.filter(post => post.id !== lastId);  // 重複がないようにしておく
      const filteredPostItems: Array<PostItem> = filteredPosts.map(post => ({
        id                : post.id,
        createdAt         : post.created_at,
        userId            : post.user_id,
        userDisplayName   : post.display_name,
        userKeyId         : post.user_key_id,
        fingerprint       : '-',
        encryption        : '-',
        signatureAlgorithm: '-',
        message           : '',
        verify            : 'Idle',
        error             : ''
      }));
      
      const baseIndex = lastId == null ? 0 : posts.length;
      const postItems = lastId == null ? filteredPostItems : [...posts, ...filteredPostItems];
      setPosts(postItems);  // ココでいったん一覧を表示させておく
      setIsLast(postsResponse.result.is_last);
      setFlow({ download: 'Done', decrypt: 'Running', verify: 'Idle', isCompleted: false });
      
      const userIds: Array<number> = [];
      const userKeyMap = new Map<number, UserKey>();  // `user_keys.id` をキーにする
      
      // 動作が重くなり投稿フォームがイジれなくなるので 1 件ずつ順次実行にする
      for(let i = 0; i < filteredPosts.length; i++) {
        const post = filteredPosts[i];
        const targetIndex = baseIndex + i;
        await wait(50);
        
        // 対象ユーザの鍵を初回取得する
        if(!userIds.includes(post.user_id)) {
          const userKeysResponse = await ky.get(`/api/users/${post.user_id}/keys`).json<UserKeysResponse>();
          for(const key of userKeysResponse.result) userKeyMap.set(key.id, key);
          userIds.push(post.user_id);
        }
        
        // 対象ユーザの鍵を控えたはずなのになかったら NG とする
        const key = userKeyMap.get(post.user_key_id);
        if(key == null) {
          postItems[targetIndex] = {
            id                : post.id,
            createdAt         : post.created_at,
            userId            : post.user_id,
            userDisplayName   : post.display_name,
            userKeyId         : post.user_key_id,
            fingerprint       : '-',
            encryption        : '-',
            signatureAlgorithm: '-',
            message           : '',
            verify            : 'Error',
            error             : '公開鍵が見つかりませんでした'
          };
          setFlow({ download: 'Done', decrypt: 'Done', verify: 'Done', isCompleted: false });
          continue;
        }
        
        const cryptoSuite = await inspectCryptoSuite(post.ciphertext, key.public_key).catch(() => ({ encryption: 'Unknown', signatureAlgorithm: 'Unknown' }));
        try {
          setFlow({ download: 'Done', decrypt: 'Running', verify: 'Idle', isCompleted: false });
          await wait(50);
          
          const decrypted = await decryptMessage(post.ciphertext, key.public_key);
          const postEnvelope = JSON.parse(decrypted) as PostEnvelope;
          
          setFlow({ download: 'Done', decrypt: 'Done', verify: 'Running', isCompleted: false });
          const isValid = await verifySignature(postEnvelope.payload, postEnvelope.signature, key.public_key);
          postItems[targetIndex] = {
            id                : post.id,
            createdAt         : post.created_at,
            userId            : post.user_id,
            userDisplayName   : post.display_name,
            userKeyId         : post.user_key_id,
            fingerprint       : key.fingerprint,
            encryption        : cryptoSuite.encryption,
            signatureAlgorithm: cryptoSuite.signatureAlgorithm,
            message           : isValid ? postEnvelope.payload.message : '[署名が一致しないため表示できません]',
            verify            : isValid ? 'Valid' : 'Invalid'
          };
        }
        catch(error) {
          postItems[targetIndex] = {
            id                : post.id,
            createdAt         : post.created_at,
            userId            : post.user_id,
            userDisplayName   : post.display_name,
            userKeyId         : post.user_key_id,
            fingerprint       : key.fingerprint,
            encryption        : cryptoSuite.encryption,
            signatureAlgorithm: cryptoSuite.signatureAlgorithm,
            message           : '',
            verify            : 'Error',
            error             : `復号・検証に失敗 : ${error instanceof Error ? error.message : '不明なエラー'}`
          };
        }
        setFlow({ download: 'Done', decrypt: 'Done', verify: 'Done', isCompleted: false });
      }
      
      await wait(50);
      setFlow({ download: 'Done', decrypt: 'Done', verify: 'Done', isCompleted: true });
    }
    catch {
      setFlow({ download: 'Error', decrypt: 'Idle', verify: 'Idle', isCompleted: true });
    }
  };
  
  /** 追加の投稿を取得する */
  const onLoadMorePosts = async (): Promise<void> => {
    if(posts.length === 0) return;
    
    const lastPostId = posts[posts.length - 1].id;
    await onLoadPosts(lastPostId);
  };
  
  // ログイン確認後にタイムラインを読み込む
  useEffect(() => {
    if(!isCheckingToken) onLoadPosts();
  }, [isCheckingToken]);
  // フラグ変数が反転したらタイムラインを再読込する
  useEffect(() => {
    onLoadPosts();
  }, [timelineReload]);
  
  return (
    <>
      <div className="text-right">
        <button
          type="button"
          className="btn btn-outline btn-sm group"
          onClick={() => { onLoadPosts(); }}
          disabled={!flow.isCompleted}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${flow.isCompleted ? 'transition-transform duration-500 group-hover:rotate-180' : 'animate-spin'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          タイムライン再読込
        </button>
      </div>
      
      <div className="mt-4 pt-5 pb-4 rounded-xl bg-base-300 grid justify-items-center">
        <div className="inline-flex items-center gap-1 text-sm">
          <div className={`${stepStyle} ${getStepStyle(flow.download)}`}>
            <div className={`${iconWrapperStyle} ${getIconWrapperStyle(flow.download)} relative`}>
              {flow.download === 'Running' && (<div className={runningStyle} />)}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
            </div>
            受信
          </div>
          
          <div className={arrowStyle}>›</div>
          
          <div className={`${stepStyle} ${getStepStyle(flow.decrypt)}`}>
            <div className={`${iconWrapperStyle} ${getIconWrapperStyle(flow.decrypt)} relative`}>
              {flow.decrypt === 'Running' && (<div className={runningStyle} />)}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
            </div>
            復号
          </div>
          
          <div className={arrowStyle}>›</div>
          
          <div className={`${stepStyle} ${getStepStyle(flow.verify)}`}>
            <div className={`${iconWrapperStyle} ${getIconWrapperStyle(flow.verify)} relative`}>
              {flow.verify === 'Running' && (<div className={runningStyle} />)}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="2 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13.92 3.845a19.361 19.361 0 0 1 6.116 5.144.5.5 0 0 1 0 .622 19.36 19.36 0 0 1-6.116 5.144.5.5 0 0 1-.52-.055L10.15 12.5H6a2.5 2.5 0 0 1-2.5-2.5V10a2.5 2.5 0 0 1 2.5-2.5h4.15l3.25-2.6a.5.5 0 0 1 .52-.055Z" />
              </svg>
            </div>
            署名検証
          </div>
        </div>
      </div>
      
      <div className="mt-8 space-y-4">
        {posts.length === 0 ? (
          <div className={`py-12 border border-dashed rounded-2xl text-center opacity-50 ${flow.download === 'Error' ? 'border-error/40' : 'border-base-content/30'}`}>
            {!flow.isCompleted ? (
              <>
                <span className="mr-3 loading loading-spinner loading-md" />
                投稿を受信・復号しています…
              </>
            ) : flow.download === 'Error' ? (
              <span className="text-error">投稿の取得に失敗しました<br />再読込をお試しください</span>
            ) : (
              <>投稿がありません<br />再読込ボタンを押すか、最初に投稿してみましょう</>
            )}
          </div>
        ) : (
          posts.map(item => (
            <TimelineItem key={item.id} postItem={item} />
          ))
        )}
      </div>
      
      {!isLast && posts.length !== 0 && (
        <button
          type="button"
          className="btn btn-primary btn-outline w-full my-8 rounded-xl"
          onClick={onLoadMorePosts}
          disabled={!flow.isCompleted}
        >
          続きを読み込む
        </button>
      )}
    </>
  );
};
