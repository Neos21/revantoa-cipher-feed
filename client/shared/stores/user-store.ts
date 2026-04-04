import ky from 'ky';
import { create } from 'zustand';

import { localStorageKeyJwt } from '../constants/constants';
import { type StoredPrivateKeyRecord } from '../stores/private-key-store';

import type { AuthCheckTokenResponse } from '../../../shared/types/api';
import type { AuthUser } from '../../../shared/types/user';

/** ログアウト時に必ず行う処理 */
const onLogout = (): void => localStorage.removeItem(localStorageKeyJwt);

/** ユーザに紐付くストア定義 */
interface UserState {
  // State
  
  /** 初回読込時に JWT チェック中か否かを示す */
  isCheckingToken: boolean;
  /** JWT チェック API から抽出した JWT・取得できれば控えておき以降の API コールで使用する */
  authToken: string | null;
  /** JWT チェック API から抽出したユーザ情報・表示に利用する */
  authUser: AuthUser | null;
  
  /** 入力されたパスフレーズ・「鍵管理パネル」から「投稿フォーム」にまたがって利用する */
  passphrase: string;
  /** 入力されたパスフレーズが正しい内容か否か・「投稿フォーム」が送信ボタンを活性化させて良いか判断するために利用する */
  isValidPassphrase: boolean;
  /** IndexedDB に保存しておいた秘密鍵情報が取得できれば控えておく・「鍵管理パネル」から「投稿フォーム」にまたがって利用する・投稿時に利用するのは常にこの秘密鍵 (秘密鍵入力欄ではない) */
  keyRecord: StoredPrivateKeyRecord | null;
  
  // 外部から State を更新するための Action
  
  /** ログインページからの遷移時にトップページの表示がチラつかないように使用する */
  setIsCheckingToken: (value: boolean) => void;
  /** パスフレーズをセットする : この関数ではバリデーションしない */
  setPassphrase: (value: string) => void;
  /** パスフレーズが正しい状態か否かをセットする */
  setIsValidPassphrase: (value: boolean) => void;
  /** 秘密鍵情報 */
  setKeyRecord: (value: StoredPrivateKeyRecord | null) => void;
  
  // 外部から呼び出す Action
  
  /** JWT をチェックする */
  checkToken: () => Promise<void>;
  /** ログアウトする */
  logout: () => void;
};

/** ユーザに紐付くストア */
export const useUserStore = create<UserState>(set => ({
  // Initial State
  
  isCheckingToken: true,
  authUser : null,
  authToken: null,
  
  passphrase: '',
  isValidPassphrase: false,
  keyRecord: null,
  
  // Action
  
  setIsCheckingToken: (value: boolean): void => set({ isCheckingToken: value }),
  setPassphrase: (value: string): void => set({ passphrase: value }),
  setIsValidPassphrase: (value: boolean): void => set({ isValidPassphrase: value }),
  setKeyRecord: (value: StoredPrivateKeyRecord | null): void => set({ keyRecord: value }),
  
  checkToken: async (): Promise<void> => {
    const token = localStorage.getItem(localStorageKeyJwt);
    if(token == null || String(token).trim() === '') return set({ isCheckingToken: false, authToken: null, authUser: null });
    
    try {
      const checkTokenResponse = await ky.get('/api/auth/check-token', { headers: { authorization: `Bearer ${token}` } }).json<AuthCheckTokenResponse>();
      
      if(!checkTokenResponse.result.is_authenticated) {
        onLogout();
        return set({ authToken: null, authUser: null, isCheckingToken: false });  // 画面上は未ログイン状態になる
      }
      
      const user = checkTokenResponse.result.user;
      set({ isCheckingToken: false, authToken: token, authUser: user });  // ログイン済となる
    }
    catch {
      set({ isCheckingToken: false, authToken: null, authUser: null });  // 画面上は未ログイン状態になる
    }
  },
  logout: (): void => {
    onLogout();
    set({ authToken: null, authUser: null });
  }
}));
