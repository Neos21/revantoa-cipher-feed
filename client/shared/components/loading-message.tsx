import { Link } from 'react-router';

import type { ReactNode } from 'react';

/** ローディングメッセージ : 少しおいてからゆっくり表示させる */
export const LoadingMessage = (): ReactNode => {
  return (
    <div className="loading-message-wrapper p-6 max-w-xl">
      <h1 className="text-4xl font-bold">CipherFeed</h1>
      
      <div className="mt-6 p-6 rounded-3xl bg-base-300 shadow-sm">
        <h2 className="font-bold text-center">読込中…</h2>
        <div className="mt-8">
          <Link to="/" className="btn btn-primary w-full shadow-lg hover:shadow-primary/30 transition-shadow rounded-xl">トップページに戻る</Link>
        </div>
      </div>
    </div>
  );
};
