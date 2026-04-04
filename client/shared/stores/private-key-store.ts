/** 秘密鍵ストアレコード */
export type StoredPrivateKeyRecord = {
  /** ユーザ ID */
  userId: number;
  /** ユーザ鍵 ID */
  userKeyId: number | null;
  /** 公開鍵 */
  publicKey: string;
  /** 秘密鍵 */
  privateKey: string;
  /** フィンガープリント */
  fingerprint: string;
  /** 作成日時 */
  createdAt: string;
};

/** IndexedDB 名 */
const dbName = 'cipher-feed' as const;
/** IndexedDB バージョン */
const dbVersion = 1 as const;
/** ストア名 */
const storeName = 'private_keys' as const;

/**
 * IndexedDB をオープンする
 * 
 * @return Database インスタンス
 * @throws IndexedDB が利用できない場合
 */
const openDatabase = (): Promise<IDBDatabase> => {
  if(typeof indexedDB === 'undefined') throw new Error('この環境では IndexedDB が利用できません');
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    
    request.onupgradeneeded = (): void => {
      const db = request.result;
      if(!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'userId' });
    };
    
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error ?? new Error('IndexedDB のオープンに失敗しました'));
  });
};

/**
 * Object Store を実行する
 * 
 * @param mode トランザクションモード
 * @param handler ストア処理
 * @return ハンドラ結果
 */
const withStore = <T,>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => Promise<T>): Promise<T> => {
  return openDatabase().then(db => {
    const transaction = db.transaction(storeName, mode);
    const objectStore = transaction.objectStore(storeName);
    
    // NOTE : 非同期化しようとしたら上手く Resolve できなかったため今のこの形で実装してある
    return handler(objectStore).finally(() => db.close());
  });
};

/**
 * IndexedDB Request を Promise 化する
 * 
 * @param request IndexedDB Request
 * @return リクエスト結果
 */
const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error ?? new Error('IndexedDB のリクエストに失敗しました'));
  });
};

/**
 * 秘密鍵を保存する
 * 
 * @param record 保存対象
 */
export const savePrivateKey = async (record: StoredPrivateKeyRecord): Promise<void> => {
  await withStore('readwrite', async store => {
    await requestToPromise(store.put(record));
  });
};

/**
 * 秘密鍵を取得する
 * 
 * @param userId ユーザ ID
 * @return 秘密鍵レコード・取得できなかった場合は `null`
 */
export const getPrivateKey = async (userId: number): Promise<StoredPrivateKeyRecord | null> => {
  return withStore('readwrite', async store => {
    const result = await requestToPromise(store.get(userId));
    if(result == null) return null;
    return result;
  });
};
