import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router';

import { KeyVault } from './components/key-vault';
import { PostForm } from './components/post-form';
import { Timeline } from './components/timeline';
import { LoadingMessage } from '../../shared/components/loading-message';
import { useUserStore } from '../../shared/stores/user-store';

/** トップページ */
export default function Index(): ReactNode {
  const {
    // State
    isCheckingToken,
    authUser,
    // Action
    checkToken
  } = useUserStore();
  
  // 画面初期表示に JWT をチェックしログイン済か否かチェックする
  useEffect(() => {
    checkToken();
  }, []);
  
  // サイドバーの開閉管理
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);
  
  /** サイドバーの固定スタイル : モバイル用と PC 用で 2 箇所に定義するため */
  const sideBarClassName = 'max-w-[30rem] overflow-y-auto bg-base-300' as const;
  
  // トークンチェック時は何も表示しない
  if(isCheckingToken) return (<LoadingMessage />);
  
  // 未ログイン状態
  if(authUser == null) {
    return (
      <div className="m-6 max-w-xl">
        <h1 className="text-4xl font-bold">CipherFeed</h1>
        
        <div className="mt-6 p-6 rounded-3xl bg-base-300 shadow-sm">
          <div className="grid place-items-center mx-auto w-16 h-16 rounded-full bg-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" />
            </svg>
          </div>
          <p className="mt-6 text-sm opacity-90">
            エンドツーエンド暗号化 (E2EE) 機能を搭載した、セキュアなフィード型 SNS です。<br />
            投稿時に自動で署名・暗号化され、閲覧時には自動で復号・署名検証されます。
          </p>
          <div className="mt-8">
            <Link to="/signup" className="btn btn-primary w-full shadow-lg hover:shadow-primary/30 transition-shadow rounded-xl">新規ユーザ登録</Link>
          </div>
          <div className="mt-6">
            <Link to="/login" className="btn btn-outline border-base-content/20 hover:bg-base-content hover:border-transparent hover:text-base-100 w-full rounded-xl">ログインページへ</Link>
          </div>
        </div>
        
        <div className="mt-8 text-right">
          <a href="https://colonet.revantoa.workers.dev" target="_blank" className="hover:underline">Colonet</a>
          <span className="mx-1 text-base-content/50">|</span>
          <a href="https://key-glyph.revantoa.workers.dev" target="_blank" className="hover:underline">KeyGlyph</a>
          <span className="mx-1 text-base-content/50">|</span>
          <a href="https://fight-for-your-right.revantoa.workers.dev" target="_blank" className="hover:underline">Fight For Your Right</a>
        </div>
      </div>
    );
  }
  
  // ログイン済
  return (
    <div className="flex min-h-full">
      <main className="flex-1">
        <div className="max-w-2xl m-6 z-10">
          <div className="grid grid-cols-2">
            <h1 className="text-4xl font-bold">CipherFeed</h1>
            
            {/* モバイル時ハンバーガーアイコン*/}
            <button
              type="button"
              className="lg:hidden btn btn-square btn-ghost justify-self-end"
              onClick={() => setIsSideBarOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <div className="mt-8">
            <PostForm />
          </div>
          <div className="mt-8">
            <Timeline />
          </div>
        </div>
      </main>
      
      {/* PC 時のサイドメニュー・`h-screen` でないと縦クスロールが出ない */}
      <aside className={`hidden sticky top-0 lg:block h-screen ${sideBarClassName}`}>
        <KeyVault />
      </aside>
      {/* モバイル時のサイドメニュー */}
      {isSideBarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* バックドロップ */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={() => setIsSideBarOpen(false)}
          />
          
          {/* `relative` で重なり順を上にし `ml-auto` で右寄せにする */}
          <div className={`relative ml-auto h-full shadow-2xl ${sideBarClassName}`}>
            {/* 閉じるボタン (iPhone だとサイドバーが画面全体を覆ってバックドロップが見えないので必要) */}
            <div className="absolute top-2 right-4">
              <button type="button" className="btn btn-link no-underline" onClick={() => setIsSideBarOpen(false)}>✕</button>
            </div>
            <KeyVault />
          </div>
        </div>
      )}
    </div>
  );
}
