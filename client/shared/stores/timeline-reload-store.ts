import { create } from 'zustand';

/** タイムラインを再読込するイベントを発火させるためのストア定義 */
interface TimelineReloadState {
  /** このフラグ変数が反転するとタイムラインを再読込する */
  timelineReload: boolean;
  
  /** フラグ変数を反転させる */
  toggleTimelineReload: () => void;
};

/** タイムラインを再読込するイベントを発火させるためのストア */
export const useTimelineReloadStore = create<TimelineReloadState>((set, get) => ({
  timelineReload: false,
  
  /** フラグ変数を反転させる */
  toggleTimelineReload: (): void => {
    const currentStore = get();
    set({ timelineReload: !currentStore.timelineReload });
  }
}));
