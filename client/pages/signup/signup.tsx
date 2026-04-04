import ky from 'ky';
import { type ReactNode, type SubmitEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import z from 'zod';

import { signupLoginSchema } from '../../../shared/schemas/user';
import { LoadingMessage } from '../../shared/components/loading-message';
import { extractHttpErrorMessage } from '../../shared/helpers/read-http-error-message';
import { useUserStore } from '../../shared/stores/user-store';

import type { UserCreateRequest, UserCreateResponse } from '../../../shared/types/api';

/** ユーザ登録ページ */
export default function SignUpPage(): ReactNode {
  const navigate = useNavigate();
  
  const {
    // State
    authUser,
    isCheckingToken,
    // Action
    checkToken
  } = useUserStore();
  
  const [name         , setName         ] = useState<string>('');
  const [nameError    , setNameError    ] = useState<string>('');
  const [password     , setPassword     ] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [formError    , setFormError    ] = useState<string>('');
  const [status       , setStatus       ] = useState<string>('');
  
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
  
  /** ユーザ登録する */
  const onSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    setNameError('');
    setPasswordError('');
    setFormError('');
    setStatus('');
    
    const parsed = signupLoginSchema.safeParse({ name, password });
    if(!parsed.success) {
      const fieldErrors = z.treeifyError(parsed.error).properties!;
      if(fieldErrors.name     != null) setNameError(fieldErrors.name.errors[0]);
      if(fieldErrors.password != null) setPasswordError(fieldErrors.password.errors[0]);
      return;
    }
    
    try {
      const userCreateRequest: UserCreateRequest = { name, password };
      await ky.post('/api/users', { json: userCreateRequest }).json<UserCreateResponse>();
      setPassword('');  // なんとなくクリアしておく
      setStatus('ユーザ登録が完了しました・ログインページに移動してログインしてください');  // 文字列が設定されたら Submit ボタンが非活性になる
    }
    catch(error) {
      setFormError(`ユーザ登録に失敗しました : ${await extractHttpErrorMessage(error)}`);
    }
  };
  
  // トークンチェック時は何も表示しない
  if(isCheckingToken) return (<LoadingMessage />);
  
  return (
    <div className="m-6 max-w-xl">
      <h1 className="text-4xl font-bold">ユーザ登録</h1>
      
      <div className="mt-6 p-6 rounded-3xl bg-base-300 shadow-sm">
        <form onSubmit={onSubmit}>
          <label className="form-control w-full space-y-3">
            <div className="label"><span className="label-text text-primary">ユーザ名</span></div>
            <input
              type="text"
              placeholder="半角小文字英数字・ハイフン (4 〜 30 文字)"
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
              placeholder="半角英数字・記号 (8 〜 50 文字)"
              value={password}
              className={`input input-bordered w-full ${passwordError !== '' ? 'input-error text-error' : 'input-primary'}`}
              onChange={event => setPassword(event.target.value)}
            />
            <div className="min-h-[1lh] px-1 text-error text-sm">{passwordError}</div>
          </label>
          
          <button
            type="submit"
            className="btn btn-primary mt-6 w-full rounded-xl shadow-lg transition-shadow hover:shadow-primary/30"
            disabled={status !== ''}
          >
            ユーザ登録する
          </button>
        </form>
        
        {formError !== '' && (<div className="mt-6 p-4 rounded-xl text-error   text-sm font-bold bg-base-100">{formError}</div>)}
        {status    !== '' && (<div className="mt-6 p-4 rounded-xl text-success text-sm font-bold bg-base-100">{status}</div>)}
      </div>
      
      <Link to="/login" className="btn btn-primary             w-full mt-8 rounded-xl shadow-lg transition-shadow hover:shadow-primary/30">ログインページへ</Link>
      <Link to="/"      className="btn btn-primary btn-outline w-full mt-6 rounded-xl">トップページに戻る</Link>
    </div>
  );
}
