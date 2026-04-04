import ky from 'ky';
import { type ReactNode, type SubmitEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import z from 'zod';

import { signupLoginSchema } from '../../../shared/schemas/user';
import { LoadingMessage } from '../../shared/components/loading-message';
import { localStorageKeyJwt } from '../../shared/constants/constants';
import { extractHttpErrorMessage } from '../../shared/helpers/read-http-error-message';
import { useUserStore } from '../../shared/stores/user-store';

import type { AuthLoginRequest, AuthLoginResponse } from '../../../shared/types/api';

/** ログインページ */
export default function LogInPage(): ReactNode {
  const navigate = useNavigate();
  
  const {
    // State : ローカルの `useState` と名前が被っているため調整してある
    isCheckingToken,
    authUser,
    // Action
    setIsCheckingToken,
    checkToken
  } = useUserStore();
  
  const [name         , setName         ] = useState<string>('');
  const [nameError    , setNameError    ] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [password     , setPassword     ] = useState<string>('');
  const [formError    , setFormError    ] = useState<string>('');
  
  // 画面初期表示に JWT をチェックしログイン済か否かチェックする
  useEffect(() => {
    (async () => {
      await checkToken();
      if(authUser != null) return navigate('/');  // ログイン済ならトップページに遷移する
    })();
  }, []);
  
  // ユーザ名の動的バリデーション
  useEffect(() => {
    const trimmedName = name.trim();
    if(trimmedName === '') return setNameError('');
    
    const parsed = signupLoginSchema.shape.name.safeParse(trimmedName);
    if(!parsed.success) {
      setNameError(z.treeifyError(parsed.error).errors[0]);
    }
    else {
      setNameError('');
    }
  }, [name]);
  
  // パスワードの動的バリデーション
  useEffect(() => {
    const trimmedPassword = password.trim();
    if(trimmedPassword === '') return setPasswordError('');
    
    const parsed = signupLoginSchema.shape.password.safeParse(trimmedPassword);
    if(!parsed.success) {
      setPasswordError(z.treeifyError(parsed.error).errors[0]);
    }
    else {
      setPasswordError('');
    }
  }, [password]);
  
  /** ログインする */
  const onSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    setNameError('');
    setPasswordError('');
    setFormError('');
    
    const parsed = signupLoginSchema.safeParse({ name, password });
    if(!parsed.success) {
      const fieldErrors = z.treeifyError(parsed.error).properties!;
      if(fieldErrors.name     != null) setNameError(fieldErrors.name.errors[0]);
      if(fieldErrors.password != null) setPasswordError(fieldErrors.password.errors[0]);
      return;
    }
    
    try {
      const loginRequest: AuthLoginRequest = { name, password };
      const loginResponse = await ky.post('/api/auth/login', { json: loginRequest }).json<AuthLoginResponse>();
      localStorage.setItem(localStorageKeyJwt, loginResponse.result.token);
      setIsCheckingToken(true);  // トップページをトークンチェック状態に変えておくことで、未ログイン時の画面が一瞬表示されないようにする
      navigate('/');
    }
    catch(error) {
      setFormError(`ログインに失敗しました : ${await extractHttpErrorMessage(error)}`);
    }
  };
  
  // トークンチェック時は何も表示しない
  if(isCheckingToken) return (<LoadingMessage />);
  
  return (
    <div className="m-6 max-w-xl">
      <h1 className="text-4xl font-bold">ログイン</h1>
      
      <div className="mt-6 p-6 rounded-3xl bg-base-300 shadow-sm">
        <form onSubmit={onSubmit}>
          <label className="form-control w-full space-y-3">
            <div className="label"><span className="label-text text-primary">ユーザ名</span></div>
            <input
              type="text"
              placeholder="ユーザ名"
              value={name}
              className={`input input-bordered w-full ${nameError !== '' ? 'input-error text-error' : 'input-primary'}`}
              onChange={event => setName(event.target.value)}
            />
            <div className="min-h-[1lh] px-1 text-error text-sm">{nameError}</div>
          </label>
          
          <label className="form-control w-full space-y-3">
            <div className="label mt-3"><span className="label-text text-primary">パスワード</span></div>
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              className={`input input-bordered w-full ${passwordError !== '' ? 'input-error text-error' : 'input-primary'}`}
              onChange={event => setPassword(event.target.value)}
            />
            <div className="min-h-[1lh] px-1 text-error text-sm">{passwordError}</div>
          </label>
          
          <button type="submit" className="btn btn-primary mt-6 w-full rounded-xl shadow-lg transition-shadow hover:shadow-primary/30">ログインする</button>
        </form>
        
        {formError !== '' && (<div className="mt-6 p-4 rounded-xl text-error text-sm font-bold bg-base-100">{formError}</div>)}
      </div>
      
      <Link to="/signup" className="btn btn-primary             w-full mt-8 rounded-xl shadow-lg transition-shadow hover:shadow-primary/30">新規ユーザ登録へ</Link>
      <Link to="/"       className="btn btn-primary btn-outline w-full mt-6 rounded-xl">トップページに戻る</Link>
    </div>
  );
}
