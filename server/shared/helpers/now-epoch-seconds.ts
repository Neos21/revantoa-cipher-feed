/**
 * UNIX Epoch 秒を取得する
 * 
 * @return 現在時刻 Epoch 秒
 */
export const nowEpochSeconds = (): number => Math.floor(Date.now() / 1000);
