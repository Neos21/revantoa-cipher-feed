import ky from 'ky';
import { useEffect, useState, type ReactNode, type SubmitEvent } from 'react';
import z from 'zod';

import { formatUtcTimestamp } from '../../../../server/shared/helpers/format-utc-timestamp';
import { messageSchema } from '../../../../shared/schemas/post';
import { encryptMessage, signPayload } from '../../../shared/helpers/pgp';
import { extractHttpErrorMessage } from '../../../shared/helpers/read-http-error-message';
import { arrowStyle, getIconWrapperStyle, getStepStyle, iconWrapperStyle, runningStyle, stepStyle } from '../../../shared/helpers/status-icon-style';
import { useTimelineReloadStore } from '../../../shared/stores/timeline-reload-store';
import { useUserStore } from '../../../shared/stores/user-store';

import type { PostCreateRequest, PostCreateResponse } from '../../../../shared/types/api';
import type { FlowStepStatus } from '../../../shared/types/flow-step-status';
import type { PostEnvelope } from '../../../shared/types/post-envelope';

/** 投稿フローのステータス */
type Flow = {
  payload: FlowStepStatus;
  sign   : FlowStepStatus;
  encrypt: FlowStepStatus;
  upload : FlowStepStatus;
};

/** 投稿フォーム */
export const PostForm = (): ReactNode => {
  const {
    // State
    authToken,
    authUser,
    passphrase,
    isValidPassphrase,
    keyRecord
  } = useUserStore();
  const { toggleTimelineReload } = useTimelineReloadStore();
  
  const [flow     , setFlow     ] = useState<Flow>({ payload: 'Idle', sign: 'Idle', encrypt: 'Idle', upload: 'Idle' });
  const [message  , setMessage  ] = useState<string>('');  // 投稿欄・メッセージ平文
  const [formError, setFormError] = useState<string>('');
  const [status   , setStatus   ] = useState<string>('');
  
  /** 投稿ができる状態であるか否か : 最低限 Submit ボタンの活性化に必要な条件 */
  const canPost = authToken != null && authUser != null && isValidPassphrase && keyRecord != null;
  /** 投稿処理中か否か : `Running` なフローが一つでもあることで判定する */
  const isPosting = Object.values(flow).some(value => value === 'Running');
  
  // メッセージの動的バリデーション
  useEffect(() => {
    const trimmedMessage = message.trim();
    if(trimmedMessage === '') return setFormError('');
    
    const parsed = messageSchema.safeParse(trimmedMessage);
    if(!parsed.success) {
      setFormError(z.treeifyError(parsed.error).errors[0]);
    }
    else {
      setFormError('');
    }
  }, [message]);
  
  const onSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    setFlow({ payload: 'Running', sign: 'Idle', encrypt: 'Idle', upload: 'Idle' });
    
    const payload = {
      user_id   : authUser!.id,
      created_at: formatUtcTimestamp(new Date()),
      message   : message
    };
    setFlow({ payload: 'Done', sign: 'Running', encrypt: 'Idle', upload: 'Idle' });
    
    let signature = '';
    try {
      signature = await signPayload(payload, keyRecord!.privateKey, passphrase);
    }
    catch(error) {
      setFlow({ payload: 'Done', sign: 'Error', encrypt: 'Idle', upload: 'Idle' });
      return setFormError(`署名に失敗しました${error instanceof Error ? ' : ' + error.message : ''}`);
    }
    
    setFlow({ payload: 'Done', sign: 'Done', encrypt: 'Running', upload: 'Idle' });
    const postEnvelope: PostEnvelope = { payload, signature };
    const envelope = JSON.stringify(postEnvelope);
    const ciphertext = await encryptMessage(envelope, keyRecord!.publicKey);
    setFlow({ payload: 'Done', sign: 'Done', encrypt: 'Done', upload: 'Running' });
    
    try {
      const postCreateRequest: PostCreateRequest = {
        user_id    : authUser!.id,
        user_key_id: keyRecord!.userKeyId!,
        ciphertext : ciphertext
      };
      const postCreateResponse = await ky.post('/api/posts', {
        headers: { authorization: `Bearer ${authToken}` },
        json: postCreateRequest
      }).json<PostCreateResponse>();
      
      setFlow({ payload: 'Done', sign: 'Done', encrypt: 'Done', upload: 'Done' });
      setStatus(`投稿が完了しました : ${postCreateResponse.result.id}`);
      setMessage('');
      toggleTimelineReload();  // タイムラインを再読込するためのフラグ変数を反転させる
      setTimeout(() => {
        setStatus('');  // 時間をおいて非表示にする
      }, 5000);
    }
    catch(error) {
      setFlow({ payload: 'Done', sign: 'Done', encrypt: 'Done', upload: 'Error' });
      setFormError(`投稿に失敗しました : ${await extractHttpErrorMessage(error)}`);
    }
  };
  
  return (
    <form onSubmit={onSubmit}>
      <div className="text-right">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canPost || message.trim() === '' || isPosting}
        >
          <span className="relative z-10 flex items-center gap-2">
            {isPosting ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                投稿中…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
                署名・暗号化して投稿する
              </>
            )}
          </span>
        </button>
      </div>
      
      <div className="mt-3">
        <div className="relative group">
          <textarea
            placeholder="投稿内容を入力してください"
            value={message}
            className="textarea textarea-bordered w-full text-sm bg-base-100/50 transition-colors focus:bg-base-100"
            disabled={!canPost || isPosting}
            onFocus={() => setStatus('')}
            onChange={event => setMessage(event.target.value)}
            rows={5}
            maxLength={500}
          />
          {/* NOTE : テキストエリアのサイズを守るために被せる形を取る */}
          {!canPost && (
            <div className="absolute inset-0 grid place-items-center rounded-xl bg-base-300 z-10">
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-error">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-bold text-error">秘密鍵が未設定です</p>
                <p className="text-sm opacity-90">
                  {isValidPassphrase ? '秘密鍵がない場合は鍵生成もしくはインポートしてください' : '鍵管理パネルにパスフレーズを入力してください'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-5 pb-4 rounded-xl bg-base-300 grid justify-items-center">
          <div className="inline-flex items-center gap-1 text-sm">
            <div className={`${stepStyle} ${getStepStyle(flow.payload)}`}>
              <div className={`${iconWrapperStyle} ${getIconWrapperStyle(flow.payload)}`}>
                {flow.payload === 'Running' && (<div className={runningStyle} />)}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </div>
              平文
            </div>
            
            <div className={arrowStyle}>›</div>
            
            <div className={`${stepStyle} ${getStepStyle(flow.sign)}`}>
              <div className={`${iconWrapperStyle} ${getIconWrapperStyle(flow.sign)}`}>
                {flow.sign === 'Running' && (<div className={runningStyle} />)}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="2 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M13.92 3.845a19.361 19.361 0 0 1 6.116 5.144.5.5 0 0 1 0 .622 19.36 19.36 0 0 1-6.116 5.144.5.5 0 0 1-.52-.055L10.15 12.5H6a2.5 2.5 0 0 1-2.5-2.5V10a2.5 2.5 0 0 1 2.5-2.5h4.15l3.25-2.6a.5.5 0 0 1 .52-.055Z" />
                </svg>
              </div>
              署名
            </div>
            
            <div className={arrowStyle}>›</div>
            
            <div className={`${stepStyle} ${getStepStyle(flow.encrypt)}`}>
              <div className={`${iconWrapperStyle} ${getIconWrapperStyle(flow.encrypt)}`}>
                {flow.encrypt === 'Running' && (<div className={runningStyle} />)}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
              </div>
              暗号化
            </div>
            
            <div className={arrowStyle}>›</div>
            
            <div className={`${stepStyle} ${getStepStyle(flow.upload)}`}>
              <div className={`${iconWrapperStyle} ${getIconWrapperStyle(flow.upload)}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </div>
              送信
            </div>
          </div>
        </div>
        
        {formError !== '' && (<div className="mt-6 p-4 rounded-xl text-error   text-sm font-bold bg-base-100">{formError}</div>)}
        {status    !== '' && (<div className="mt-6 p-4 rounded-xl text-success text-sm font-bold bg-base-100">{status}</div>)}
      </div>
    </form>
  );
};
