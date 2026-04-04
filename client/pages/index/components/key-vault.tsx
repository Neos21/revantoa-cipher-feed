import ky, { isHTTPError } from 'ky';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import z from 'zod';

import { formatUtcTimestamp } from '../../../../server/shared/helpers/format-utc-timestamp';
import { passphraseSchema } from '../../../../shared/schemas/key';
import { generateKeyPair, inspectPrivateKey } from '../../../shared/helpers/pgp';
import { extractHttpErrorMessage } from '../../../shared/helpers/read-http-error-message';
import { getPrivateKey, savePrivateKey, type StoredPrivateKeyRecord } from '../../../shared/stores/private-key-store';
import { useUserStore } from '../../../shared/stores/user-store';

import type { UserKeyCreateRequest, UserKeyCreateResponse, UserKeysResponse } from '../../../../shared/types/api';

/** 鍵管理パネル */
export const KeyVault = (): ReactNode => {
  const {
    // State
    authToken,
    authUser,
    keyRecord,
    passphrase,
    // Action
    setPassphrase,
    setIsValidPassphrase,
    setKeyRecord,
    logout
  } = useUserStore();
  
  const [passphraseError      , setPassphraseError      ] = useState<string>('');
  const [generateKeyPairError , setGenerateKeyPairError ] = useState<string>('');  // 鍵ペア生成時のフィードバック
  const [generateKeyPairStatus, setGenerateKeyPairStatus] = useState<string>('');  // 鍵ペア生成時のフィードバック
  const [importKeyError       , setImportKeyError       ] = useState<string>('');  // インポート時のフィードバック
  const [importKeyStatus      , setImportKeyStatus      ] = useState<string>('');  // インポート時のフィードバック
  const [privateKeyText       , setPrivateKeyText       ] = useState<string>('');  // 秘密鍵テキストエリア (フォームバリデーションなし)
  
  // 初期表示時に秘密鍵があれば読み込んでテキストエリアにセットしておく
  useEffect(() => {
    (async () => {
      if(authUser == null) return;
      const storedKeyRecord = await getPrivateKey(authUser.id);
      if(storedKeyRecord != null) {
        setKeyRecord(storedKeyRecord);
        setPrivateKeyText(storedKeyRecord.privateKey);
      }
    })();
  }, [authUser]);
  
  // テキストボックスでは `setPassphrase` を常に実行し、ココで動的バリデーションを行い `isValidPassphrase` を更新する
  useEffect(() => {
    if(passphrase === '') {
      setIsValidPassphrase(false);
      return setPassphraseError('');
    }
    
    const parsed = passphraseSchema.safeParse(passphrase);
    setIsValidPassphrase(parsed.success);
    if(!parsed.success) {
      setPassphraseError(z.treeifyError(parsed.error).errors[0]);
    }
    else {
      setPassphraseError('');
    }
  }, [passphrase]);
  
  /** 鍵ペア生成が可能な条件 : パスフレーズが入力済で秘密鍵インポート欄が空欄なこと */
  const canGenerate = passphrase.trim().length >= 8 && passphraseError === '' && privateKeyText.trim() === '';
  /** 秘密鍵インポートボタンが押下可能な条件 : パスフレーズと秘密鍵が入力済なこと */
  const canImport   = passphrase.trim().length >= 8 && passphraseError === '' && privateKeyText.trim() !== '';
  
  /** 鍵ペアを生成する */
  const onGenerateAndStorePrivateKey = async (): Promise<void> => {
    setGenerateKeyPairStatus('生成中…');
    setGenerateKeyPairError('');
    try {
      const keyPair = await generateKeyPair(authUser!.name, passphrase);
      const recordToStore: StoredPrivateKeyRecord = {
        userId     : authUser!.id,
        userKeyId  : null,
        publicKey  : keyPair.publicKey,
        privateKey : keyPair.privateKey,
        fingerprint: keyPair.fingerprint,
        createdAt  : formatUtcTimestamp(new Date())
      };
      
      const userKeyCreateRequest: UserKeyCreateRequest = {
        user_id    : authUser!.id,
        public_key : recordToStore.publicKey,
        fingerprint: recordToStore.fingerprint
      };
      const userKeyCreateResponse = await ky.post(`/api/users/${authUser!.id}/keys`, {
        headers: { authorization: `Bearer ${authToken}` },
        json: userKeyCreateRequest
      }).json<UserKeyCreateResponse>();
      recordToStore.userKeyId = userKeyCreateResponse.result.id;
      
      await savePrivateKey(recordToStore);
      setKeyRecord(recordToStore);
      setPrivateKeyText(recordToStore.privateKey);
      setGenerateKeyPairStatus(`鍵ペアを生成しサーバに登録しました : ${recordToStore.fingerprint}`);
      setTimeout(() => {
        setGenerateKeyPairStatus('');  // 時間をおいて非表示にする
      }, 5000);
    }
    catch(error) {
      setGenerateKeyPairStatus('');
      setGenerateKeyPairError(`鍵の生成・登録に失敗しました : ${await extractHttpErrorMessage(error)}`);
    }
  };
  
  /** 秘密鍵をインポートする */
  const onImportPrivateKey = async (): Promise<void> => {
    setImportKeyStatus('インポート中…');
    setImportKeyError('');
    try {
      // 秘密鍵を解析して公開鍵とフィンガープリントを抽出する
      const importedKey = await inspectPrivateKey(privateKeyText, passphrase);
      
      // 公開鍵を登録する
      let userKeyId: number | null = null;
      try {
        const userKeyCreateRequest: UserKeyCreateRequest = {
          user_id    : authUser!.id,
          public_key : importedKey.publicKey,
          fingerprint: importedKey.fingerprint
        };
        const userKeyCreateResponse = await ky.post(`/api/users/${authUser!.id}/keys`, {
          headers: { authorization: `Bearer ${authToken}` },
          json: userKeyCreateRequest
        }).json<UserKeyCreateResponse>();
        
        userKeyId = userKeyCreateResponse.result.id;
      }
      catch(error) {
        // 登録済 (HTTP 409) の場合は、既存の鍵リストから ID を取得して復元成功扱いとする
        if(isHTTPError(error) && error.response.status === 409) {
          const userKeysResponse = await ky.get(`/api/users/${authUser!.id}/keys`).json<UserKeysResponse>();
          const matchedKey = userKeysResponse.result.find(key => key.fingerprint === importedKey.fingerprint);
          userKeyId = matchedKey!.id;
        }
        else {
          throw error;  // その他のエラーはそのまま再スローする
        }
      }
      
      // 秘密鍵を IndexedDB に保存する
      const recordToStore: StoredPrivateKeyRecord = {
        userId     : authUser!.id,
        userKeyId  : userKeyId,
        publicKey  : importedKey.publicKey,
        privateKey : privateKeyText,
        fingerprint: importedKey.fingerprint,
        createdAt  : formatUtcTimestamp(new Date())
      };
      await savePrivateKey(recordToStore);
      setKeyRecord(recordToStore);
      setImportKeyStatus(`秘密鍵をインポートしました : ${userKeyId}`);
      setTimeout(() => {
        setImportKeyStatus('');  // 時間をおいて非表示にする
      }, 5000);
    }
    catch(error) {
      setImportKeyStatus('');
      setImportKeyError(`秘密鍵のインポートに失敗しました : ${error instanceof Error ? error.message : await extractHttpErrorMessage(error)}`);
    }
  };
  
  return (
    <div className="w-full min-h-full p-4 pb-10 bg-base-300">
      <h2 className="text-lg font-bold flex items-center gap-2 border-b border-base-200">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary shrink-0">
          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
        </svg>
        鍵管理パネル
      </h2>
      
      <section className="relative mt-4 border border-base-100 rounded-xl p-2 bg-base-200/50">
        <div className="absolute top-2 right-2.5">
          <span className="relative flex w-3 h-3">
            <span className={`absolute inline-flex w-full h-full rounded-full opacity-75   ${keyRecord == null ? 'bg-error' : 'bg-success'}`}></span>
            <span className={`relative inline-flex w-3    h-3    rounded-full animate-ping ${keyRecord == null ? 'bg-error' : 'bg-success'}`}></span>
          </span>
        </div>
        <h3 className="text-sm opacity-90">現在の鍵ステータス</h3>
        
        <p className={`mt-2 font-bold text-sm ${keyRecord == null ? 'text-error' : 'text-success'}`}>
          {keyRecord == null ? '🔒 鍵なし (投稿不可)' : '✅ 鍵あり (投稿可能)'}
        </p>
        <div className="mt-2 min-h-[2lh] text-sm leading-[1.5] opacity-90">
          {keyRecord == null ? (
            '下の手順に沿って鍵を生成・登録してください'
          ) : (
            <>
              鍵ID : {keyRecord.userKeyId ?? '未登録'}<br />
              <span className="tooltip tooltip-bottom" data-tip="フィンガープリント">{keyRecord.fingerprint}</span>
            </>
          )}
        </div>
      </section>
      
      <section className="mt-6 flex flex-col gap-3">
        <h3 className="text-sm font-bold flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-primary" />
          パスフレーズ (鍵の生成・使用に必要)
        </h3>
        
        <div className="form-control">
          <input
            type="text"
            placeholder="8文字以上"
            value={passphrase}
            className={`input input-sm input-bordered w-full bg-base-content/5 focus:bg-base-content/10 transition-colors ${passphraseError !== '' ? 'input-error text-error' : ''}`}
            onChange={event => setPassphrase(event.target.value)}
          />
          <div className="mt-1 min-h-[1lh] px-1 text-error text-sm">{passphraseError}</div>
        </div>
      </section>
      
      <section className="mt-4 flex flex-col gap-3">
        <h3 className="text-sm font-bold flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-primary" />
          鍵ペアを生成して保存する
        </h3>
        
        <p className="text-sm leading-[1.6] opacity-90">
          パスフレーズを入力すると鍵ペアを生成できます<br />
          サーバへの公開鍵登録とブラウザへの秘密鍵保存を自動で行います<br />
          別の鍵ペアを生成する際は下の「秘密鍵」テキストエリアを空にしてから実行してください
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm w-full"
          onClick={onGenerateAndStorePrivateKey}
          disabled={!canGenerate || generateKeyPairStatus !== ''}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
          </svg>
          鍵ペアを生成して保存する
        </button>
        
        {generateKeyPairError  !== '' && <p className="text-sm text-error  ">{generateKeyPairError }</p>}
        {generateKeyPairStatus !== '' && <p className="text-sm text-success">{generateKeyPairStatus}</p>}
      </section>
      
      <section className="mt-10 flex flex-col gap-3">
        <h3 className="text-sm font-bold flex items-center gap-1">
          <span className="badge badge-primary badge-sm">復元</span>
          鍵のバックアップ・インポート
        </h3>
        
        <p className="text-sm leading-[1.6] opacity-90">
          生成した秘密鍵は手元に控えておいてください
          バックアップしておいた秘密鍵や、他のツールで生成した PGP 秘密鍵を貼り付けることでインポートができます<br />
          インポートする際はパスフレーズを入力してください
        </p>
        <textarea
          placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----&#10;...&#10;-----END PGP PRIVATE KEY BLOCK-----"
          value={privateKeyText}
          className="textarea textarea-bordered w-full text-sm bg-base-content/5 transition-colors focus:bg-base-content/10"
          onChange={event => { setPrivateKeyText(event.target.value); setImportKeyStatus(''); }}
          rows={8}
        />
        <button
          type="button"
          className="btn btn-sm btn-outline w-full"
          onClick={onImportPrivateKey}
          disabled={!canImport || importKeyStatus !== ''}
        >
          秘密鍵をインポートする
        </button>
        
        {importKeyError  !== '' && <p className="text-sm text-error  ">{importKeyError }</p>}
        {importKeyStatus !== '' && <p className="text-sm text-success">{importKeyStatus}</p>}
      </section>
      
      <section className="mt-10 text-right">
        <div className="mr-2 font-bold text-accent">{authUser!.display_name}</div>
        <div className="mt-3"><Link to="/settings" className="btn btn-ghost btn-sm btn-primary">ユーザ設定</Link></div>
        <div className="mt-2"><button type="button" onClick={logout} className="btn btn-ghost btn-sm btn-error">ログアウト</button></div>
      </section>
    </div>
  );
};
