import { type ReactElement, type ReactNode } from 'react';
import { isRouteErrorResponse, Link, Links, Outlet, Scripts, ScrollRestoration } from 'react-router';

import type { Route } from './+types/root';

import './styles.css';

/**
 * HTML レイアウトを描画する
 * 
 * @param children 子要素
 * @return レイアウト要素
 */
export const Layout = ({ children }: { children: ReactNode }): ReactElement => {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>CipherFeed</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#88ff00" />
        <meta name="description" content="CipherFeed" />
        <meta name="keywords" content="CipherFeed" />
        <meta name="robots" content="index,follow" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CipherFeed" />
        <meta property="og:title" content="CipherFeed" />
        <meta property="og:description" content="CipherFeed" />
        <meta property="og:url" content="https://cipher-feed.revantoa.workers.dev" />
        <meta property="og:image" content="https://cipher-feed.revantoa.workers.dev/icon-512.png" />
        <meta property="og:locale" content="ja_JP" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="CipherFeed" />
        <meta property="twitter:description" content="CipherFeed" />
        <meta property="twitter:url" content="https://cipher-feed.revantoa.workers.dev" />
        <meta property="twitter:image" content="https://cipher-feed.revantoa.workers.dev/icon-512.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=M+PLUS+1+Code:wght@500&amp;display=swap" fetchPriority="high" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+1+Code:wght@500&amp;display=swap" fetchPriority="high" />
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="preconnect" href="https://static.cloudflareinsights.com" />
        <Links />
        {/* NOTE : 以下の `data-cf-beacon` 属性のみ、シングルクォートで囲み、内部をダブルクォートで記しておくことを許可する */}
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"ef212dc70de54174b4e189c8115549e4"}' />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

/**
 * ルートのマウント先を描画する
 * 
 * @return マウント要素
 */
export default function App(): ReactElement {
  return (<Outlet />);
}

/**
 * 画面初期表示時にチラつかないように・余計なコンソールログが出ないようにする
 * 
 * @return 空要素
 */
export const HydrateFallback = (): ReactElement => {
  return (<></>);
};

/**
 * ルートエラー時の表示を描画する
 * 
 * @param error ルートエラー
 * @return エラー表示要素
 */
export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps): ReactElement => {
  let title = 'エラー';
  let text  = `エラーが発生しました${error instanceof Error ? + ' : ' + error.message : ''}`;
  if(isRouteErrorResponse(error) && error.status === 404) {
    title = '404';
    text  = 'ページが見つかりませんでした';
  }
  
  return (
    <div className="m-6 max-w-xl">
      <h1 className="text-4xl font-bold">CipherFeed</h1>
      
      <div className="mt-6 p-6 rounded-3xl bg-base-300 shadow-sm">
        <h2>{title}</h2>
        <p className="mt-6 text-error">{text}</p>
        <div className="mt-8">
          <Link to="/" className="btn btn-primary w-full shadow-lg hover:shadow-primary/30 transition-shadow rounded-xl">トップページに戻る</Link>
        </div>
      </div>
    </div>
  );
};
