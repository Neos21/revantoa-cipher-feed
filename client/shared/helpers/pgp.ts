import { createMessage, decrypt, decryptSessionKeys, decryptKey, encrypt, generateKey, readKey, readMessage, readPrivateKey, readSignature, sign, verify } from 'openpgp';

/** 鍵ペア生成結果 */
export type KeyPairResult = {
  /** 公開鍵 */
  publicKey: string;
  /** 秘密鍵 */
  privateKey: string;
  /** フィンガープリント */
  fingerprint: string;
};

/** 秘密鍵解析結果 */
export type ImportedPrivateKeyResult = {
  /** 公開鍵 */
  publicKey: string;
  /** フィンガープリント */
  fingerprint: string;
};

/** 暗号スイート解析結果 : 暗号方式と署名方式 */
export type CryptoSuiteInfo = {
  /** 暗号方式 */
  encryption: string;
  /** 署名方式 */
  signatureAlgorithm: string;
};

/**
 * 公開鍵アルゴリズム表示を整形する
 * 
 * @param publicKeyArmored Armored 公開鍵
 * @return 署名方式表示
 */
const formatSignatureAlgorithm = async (publicKeyArmored: string): Promise<string> => {
  const key = await readKey({ armoredKey: publicKeyArmored.trim() });
  const algorithmInfo = key.getAlgorithmInfo();
  const algorithm = algorithmInfo.algorithm;
  const curve = algorithmInfo.curve;
  if(curve != null) return `${algorithm} (${curve})`;
  if(typeof algorithmInfo.bits === 'number') return `${algorithm} (${algorithmInfo.bits})`;
  return algorithm;
};

/**
 * 対称暗号アルゴリズム表示を整形する
 * 
 * @param algorithm OpenPGP アルゴリズム名
 * @return 表示文字列
 */
const formatEncryptionAlgorithm = (algorithm: string | null): string => {
  if(algorithm == null || algorithm === '') return 'Unknown';
  
  const normalized = algorithm.toLowerCase();
  if(normalized.startsWith('aes')) return normalized.replace('aes', 'AES-');
  
  return algorithm.toUpperCase();
};

/**
 * 値を安定順序で JSON 文字列化する
 * 
 * @param value 変換対象
 * @return JSON 文字列
 */
const stableStringify = (value: unknown): string => {
  if(value == null || typeof value !== 'object') return JSON.stringify(value);
  
  if(Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`;
  
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(',')}}`;
};

/**
 * 鍵ペアを生成する
 * 
 * @param name ログインユーザ名
 * @param passphrase パスフレーズ
 * @return 鍵ペア
 */
export const generateKeyPair = async (name: string, passphrase: string): Promise<KeyPairResult> => {
  const userId = name.trim() === '' ? name.trim() : 'Unknown User';
  const result = await generateKey({
    type      : 'ecc',
    userIDs   : [{ name: userId }],
    passphrase: passphrase,
    format    : 'armored'
  });
  
  const publicKeyObject = await readKey({ armoredKey: result.publicKey });
  
  return {
    publicKey  : result.publicKey,
    privateKey : result.privateKey,
    fingerprint: publicKeyObject.getFingerprint()
  };
};

/**
 * 秘密鍵から公開鍵情報を抽出する
 * 
 * @param privateKeyArmored Armored 秘密鍵
 * @param passphrase パスフレーズ
 * @return 公開鍵情報
 */
export const inspectPrivateKey = async (privateKeyArmored: string, passphrase: string): Promise<ImportedPrivateKeyResult> => {
  const privateKey = await readPrivateKey({ armoredKey: privateKeyArmored.trim() });
  const decryptedPrivateKey = await decryptKey({ privateKey, passphrase });
  const publicKey = decryptedPrivateKey.toPublic();
  
  return {
    publicKey  : publicKey.armor(),
    fingerprint: publicKey.getFingerprint()
  };
};

/**
 * ペイロードに署名を生成する
 * 
 * @param payload 署名対象ペイロード
 * @param privateKeyArmored Armored 秘密鍵
 * @param passphrase パスフレーズ
 * @return Armored 分離署名
 */
export const signPayload = async (payload: unknown, privateKeyArmored: string, passphrase: string): Promise<string> => {
  const privateKey = await readPrivateKey({ armoredKey: privateKeyArmored.trim() });
  const decryptedPrivateKey = await decryptKey({ privateKey, passphrase });
  const payloadText = stableStringify(payload);
  const message = await createMessage({ text: payloadText });
  
  return sign({
    message    : message,
    signingKeys: decryptedPrivateKey,
    detached   : true,
    format     : 'armored'
  });
};

/**
 * 署名を検証する
 * 
 * @param payload 検証対象ペイロード
 * @param signatureArmored Armored 署名
 * @param publicKeyArmored Armored 公開鍵
 * @return 検証に成功したら `true`
 */
export const verifySignature = async (payload: unknown, signatureArmored: string, publicKeyArmored: string): Promise<boolean> => {
  const message = await createMessage({ text: stableStringify(payload) });
  const signature = await readSignature({ armoredSignature: signatureArmored });
  const normalizedPublicKey = publicKeyArmored.trim();
  const verification = await verify({
    message         : message,
    signature       : signature,
    verificationKeys: await readKey({ armoredKey: normalizedPublicKey })
  });
  
  try {
    await verification.signatures[0]?.verified;
    return true;
  }
  catch {
    return false;
  }
};

/**
 * メッセージを暗号化する
 * 
 * @param plaintext 平文
 * @param publicKey 公開鍵
 * @return Armored 暗号文
 */
export const encryptMessage = async (plaintext: string, publicKey: string): Promise<string> => {
  const message = await createMessage({ text: plaintext });
  const normalizedPublicKey = publicKey.trim();
  return encrypt({
    message  : message,
    passwords: [normalizedPublicKey],
    format   : 'armored'
  });
};

/**
 * メッセージを復号する
 * 
 * @param ciphertext Armored 暗号文
 * @param publicKey 公開鍵
 * @return 復号平文
 */
export const decryptMessage = async (ciphertext: string, publicKey: string): Promise<string> => {
  const message = await readMessage({ armoredMessage: ciphertext });
  const normalizedPublicKey = publicKey.trim();
  const result = await decrypt({
    message  : message,
    passwords: [normalizedPublicKey],
    format   : 'utf8'
  });
  return result.data;
};

/**
 * 暗号文と公開鍵から暗号スイートを解析する
 * 
 * @param ciphertext Armored 暗号文
 * @param publicKeyArmored Armored 公開鍵
 * @return 暗号スイート解析結果 : 暗号方式と署名方式
 */
export const inspectCryptoSuite = async (ciphertext: string, publicKeyArmored: string): Promise<CryptoSuiteInfo> => {
  const message = await readMessage({ armoredMessage: ciphertext });
  const decryptedSessionKeys = await decryptSessionKeys({
    message  : message,
    passwords: [publicKeyArmored.trim()]
  });
  const encryption = formatEncryptionAlgorithm(decryptedSessionKeys[0]?.algorithm ?? null);
  const signatureAlgorithm = await formatSignatureAlgorithm(publicKeyArmored);
  return { encryption, signatureAlgorithm };
};
