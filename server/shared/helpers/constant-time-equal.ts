/**
 * バイト列を定数時間で比較する
 * 
 * @param left 左辺
 * @param right 右辺
 * @return 一致したら `true`
 */
export const constantTimeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if(left.length !== right.length) return false;
  
  let diff = 0;
  for(let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
};
