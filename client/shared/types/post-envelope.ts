/** 投稿のエンベロープ (暗号化するオブジェクトの型・復号後の型) */
export type PostEnvelope = {
  payload: {
    user_id   : number;
    created_at: string;
    message   : string;
  };
  signature: string;
};
