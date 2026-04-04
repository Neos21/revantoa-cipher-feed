import ky from 'ky';
import { type ReactNode, type SubmitEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import z from 'zod';

import { userUpdateSchema } from '../../../shared/schemas/user';
import { LoadingMessage } from '../../shared/components/loading-message';
import { extractHttpErrorMessage } from '../../shared/helpers/read-http-error-message';
import { useUserStore } from '../../shared/stores/user-store';

import type { UserUpdateResponse, UserUpdateRequest } from '../../../shared/types/api';

/** ユーザ設定ページ */
export default function SettingsPage(): ReactNode {
  const navigate = useNavigate();
  
  const {
    // State
    authToken,
    authUser,
    // Action
    checkToken,
    logout
  } = useUserStore();
  
  const [displayName         , setDisplayName         ] = useState<string | null>(null);
  const [displayNameError    , setDisplayNameError    ] = useState<string>('');
  const [displayNameStatus   , setDisplayNameStatus   ] = useState<string>('');
  const [displayNameFormError, setDisplayNameFormError] = useState<string>('');
  
  const [currentPassword     , setCurrentPassword     ] = useState<string>('');
  const [currentPasswordError, setCurrentPasswordError] = useState<string>('');
  const [newPassword         , setNewPassword         ] = useState<string>('');
  const [newPasswordError    , setNewPasswordError    ] = useState<string>('');
  const [passwordStatus      , setPasswordStatus      ] = useState<string>('');
  const [passwordFormError   , setPasswordFormError   ] = useState<string>('');
  
  const [deleteAccountFormError, setDeleteAccountFormError] = useState<string>('');
  
  // 初期表示 : `authUser` がセットされるのを待つ
  useEffect(() => {
    checkToken();
  }, []);
  // `authUser` から表示名を取得し初期表示する
  useEffect(() => {
    if(authUser != null) setDisplayName(authUser.display_name);
  }, [authUser]);
  
  // 表示名の動的バリデーション
  useEffect(() => {
    if(displayName == null) return;  // 未設定時にチラつかないようにする
    const parsed = userUpdateSchema.shape.display_name.safeParse(displayName);
    if(!parsed.success) {
      setDisplayNameError(z.treeifyError(parsed.error).errors[0]);
    }
    else {
      setDisplayNameError('');
    }
  }, [displayName]);
  
  // 現在のパスワードの動的バリデーション
  useEffect(() => {
    if(currentPassword === '') return setCurrentPasswordError('');
    const parsed = userUpdateSchema.shape.current_password.safeParse(currentPassword);
    if(!parsed.success) {
      setCurrentPasswordError(z.treeifyError(parsed.error).errors[0]);
    }
    else {
      setCurrentPasswordError('');
    }
  }, [currentPassword]);
  
  // 新しいパスワードの動的バリデーション
  useEffect(() => {
    if(newPassword === '') return setNewPasswordError('');
    const parsed = userUpdateSchema.shape.new_password.safeParse(newPassword);
    if(!parsed.success) {
      setNewPasswordError(z.treeifyError(parsed.error).errors[0]);
    }
    else {
      setNewPasswordError('');
    }
  }, [newPassword]);
  
  /** 表示名を変更する */
  const onUpdateDisplayName = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    setDisplayNameError('');
    setDisplayNameFormError('');
    setDisplayNameStatus('');
    
    const parsed = userUpdateSchema.safeParse({ display_name: displayName });
    if(!parsed.success) {
      const fieldErrors = z.treeifyError(parsed.error).properties!;
      if(fieldErrors.display_name != null) return setDisplayNameError(fieldErrors.display_name.errors[0]);
    }
    
    try {
      const request: UserUpdateRequest = { display_name: displayName! };
      await ky.patch('/api/users/me', {
        headers: { authorization: `Bearer ${authToken}` },
        json: request
      }).json<UserUpdateResponse>();
      setDisplayNameStatus('表示名を更新しました');
      setTimeout(() => {
        setDisplayNameStatus('');  // 時間をおいて非表示にする
      }, 5000);
    }
    catch(error) {
      setDisplayNameFormError(`表示名の更新に失敗しました : ${await extractHttpErrorMessage(error)}`);
    }
  };
  
  /** パスワードを変更する */
  const onUpdatePassword = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    setCurrentPasswordError('');
    setNewPasswordError('');
    setPasswordFormError('');
    setPasswordStatus('');
    
    const parsed = userUpdateSchema.safeParse({ current_password: currentPassword, new_password: newPassword });
    if(!parsed.success) {
      const fieldErrors = z.treeifyError(parsed.error).properties!;
      if(fieldErrors.current_password) setCurrentPasswordError(fieldErrors.current_password.errors[0]);
      if(fieldErrors.new_password)     setNewPasswordError(fieldErrors.new_password.errors[0]);
      return;
    }
    if(currentPassword === newPassword) return setPasswordFormError('新しいパスワードは現在のパスワードと異なるものを入力してください');
    
    try {
      const request: UserUpdateRequest = { current_password: currentPassword, new_password: newPassword };
      await ky.patch('/api/users/me', {
        headers: { authorization: `Bearer ${authToken}` },
        json: request
      }).json<UserUpdateResponse>();
      setCurrentPassword('');
      setNewPassword('');
      setPasswordStatus('パスワードを更新しました');
      setTimeout(() => {
        setPasswordStatus('');  // 時間をおいて非表示にする
      }, 5000);
    }
    catch(error) {
      setPasswordFormError(`パスワードの更新に失敗しました : ${await extractHttpErrorMessage(error)}`);
    }
  };
  
  /** アカウントを削除する */
  const onDeleteAccount = async (): Promise<void> => {
    if(!confirm('本当にアカウントを削除しますか？\nこの操作は取り消せません。投稿や鍵も全て削除されます')) return;
    setDeleteAccountFormError('');
    
    try {
      await ky.delete('/api/users/me', { headers: { authorization: `Bearer ${authToken}` } }).json();
      logout();
      navigate('/');
    }
    catch(error) {
      setDeleteAccountFormError(`アカウントの削除に失敗しました : ${await extractHttpErrorMessage(error)}`);
    }
  };
  
  // アカウント情報が取得できるまでは何も表示しない
  if(authUser == null) return (<LoadingMessage />);
  
  return (
    <div className="m-6 max-w-xl space-y-10">
      <h1 className="text-4xl font-bold">ユーザ設定</h1>
      
      <section className="p-6 rounded-3xl bg-base-300 shadow-sm">
        <h2 className="border-b border-primary/70 pb-1 text-xl font-bold">表示名の変更</h2>
        <form onSubmit={onUpdateDisplayName} className="mt-6 flex flex-col gap-4">
          <label className="form-control w-full space-y-3">
            <div className="label"><span className="label-text text-primary">新しい表示名</span></div>
            <input
              type="text"
              placeholder="表示名"
              value={displayName ?? ''}
              className={`input input-bordered w-full ${displayNameError !== '' ? 'input-error text-error' : 'input-primary'}`}
              onFocus={() => setDisplayNameStatus('')}
              onChange={event => setDisplayName(event.target.value)}
            />
            <div className="min-h-[1lh] px-1 text-error text-sm">{displayNameError}</div>
          </label>
          <button type="submit" className="btn btn-primary w-full rounded-xl shadow-lg transition-shadow hover:shadow-primary/30">表示名を変更する</button>
        </form>
        
        {displayNameFormError !== '' && (<div className="mt-6 p-4 rounded-xl text-error text-sm font-bold bg-base-100">{displayNameFormError}</div>)}
        {displayNameStatus    !== '' && (<div className="mt-6 p-4 rounded-xl text-success text-sm font-bold bg-base-100">{displayNameStatus}</div>)}
      </section>
      
      <section className="p-6 rounded-3xl bg-base-300 shadow-sm">
        <h2 className="border-b border-primary/70 pb-1 text-xl font-bold">パスワードの変更</h2>
        <form onSubmit={onUpdatePassword} className="mt-6 flex flex-col gap-4">
          <label className="form-control w-full space-y-3">
            <div className="label"><span className="label-text text-primary">現在のパスワード</span></div>
            <input
              type="password"
              placeholder="現在のパスワード"
              value={currentPassword}
              className={`input input-bordered w-full ${currentPasswordError !== '' ? 'input-error text-error' : 'input-primary'}`}
              onFocus={() => setPasswordStatus('')}
              onChange={event => setCurrentPassword(event.target.value)}
            />
            <div className="min-h-[1lh] px-1 text-error text-sm">{currentPasswordError}</div>
          </label>
          <label className="form-control w-full space-y-3">
            <div className="label"><span className="label-text text-primary">新しいパスワード</span></div>
            <input
              type="password"
              placeholder="新しいパスワード"
              value={newPassword}
              className={`input input-bordered w-full ${newPasswordError !== '' ? 'input-error text-error' : 'input-primary'}`}
              onFocus={() => setPasswordStatus('')}
              onChange={event => setNewPassword(event.target.value)}
            />
            <div className="min-h-[1lh] px-1 text-error text-sm">{newPasswordError}</div>
          </label>
          <button type="submit" className="btn btn-primary w-full rounded-xl shadow-lg transition-shadow hover:shadow-primary/30">パスワードを変更する</button>
        </form>
        
        {passwordFormError !== '' && (<div className="mt-6 p-4 rounded-xl text-error text-sm font-bold bg-base-100">{passwordFormError}</div>)}
        {passwordStatus    !== '' && (<div className="mt-6 p-4 rounded-xl text-success text-sm font-bold bg-base-100">{passwordStatus}</div>)}
      </section>
      
      <section className="p-6 rounded-3xl text-error bg-error/5 border border-error/10 shadow-sm">
        <h2 className="border-b border-error/70 pb-1 text-xl font-bold">アカウントの削除</h2>
        <p className="mt-6 text-sm opacity-90">アカウントを削除すると、今までの投稿や登録した公開鍵が完全に削除され、復旧できなくなります</p>
        <p className="mt-6"><button type="button" className="btn btn-error btn-outline w-full rounded-xl" onClick={onDeleteAccount}>アカウントを削除する</button></p>
        
        {deleteAccountFormError !== '' && (<div className="mt-6 p-4 rounded-xl text-error text-sm font-bold bg-base-100">{deleteAccountFormError}</div>)}
      </section>
      
      <div className="mt-6 pb-10">
        <Link to="/" className="btn btn-primary btn-outline w-full rounded-xl">トップページに戻る</Link>
      </div>
    </div>
  );
}
