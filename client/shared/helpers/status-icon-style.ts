import type { FlowStepStatus } from '../types/flow-step-status';

/** 処理フロー一枠の固定スタイル */
export const stepStyle = 'flex flex-col items-center gap-1 min-w-[52px] transition-all duration-300' as const;

/** 処理フロー一枠の動的スタイル */
export const getStepStyle = (status: FlowStepStatus): string => {
  switch(status) {
    case 'Idle'   : return 'opacity-40 grayscale';
    case 'Running': return 'text-warning animate-pulse brightness-125';
    case 'Done'   : return 'text-success';
    case 'Error'  : return 'text-error animate-bounce';
    default       : return '';  // ないはず
  }
};

/** 処理フロー一枠内のアイコンラッパーの固定スタイル */
export const iconWrapperStyle = 'p-2 rounded-lg transition-all duration-300' as const;

/** 処理フロー一枠内のアイコンラッパーの動的スタイル */
export const getIconWrapperStyle = (status: FlowStepStatus): string => {
  switch(status) {
    case 'Idle'   : return 'bg-base-300 border border-base-100';
    case 'Running': return 'bg-base-300 border border-warning';
    case 'Done'   : return 'bg-base-300 border border-success shadow-[0_0_8px_rgba(0,255,128,0.7)]';
    case 'Error'  : return 'bg-base-300 border border-error shadow-[0_0_8px_rgba(255,80,80,0.7)]';
    default       : return '';  // ないはず
  }
};

/** 動作中の固定スタイル */
export const runningStyle = 'absolute inset-0 border-2 border-warning rounded-lg animate-ping' as const;

/** 処理フロー間の「>」記号を示す固定スタイル */
export const arrowStyle = 'opacity-30 text-lg shrink-0' as const;
