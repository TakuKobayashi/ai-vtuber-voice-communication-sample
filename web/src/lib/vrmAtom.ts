import { atom } from 'jotai';

export type VrmEntry = {
  /** プルダウン表示名 */
  label: string;
  /** objectURL or 静的パス */
  url: string;
  /** ユーザーが追加したカスタムVRMかどうか */
  isCustom: boolean;
};

/** デフォルトで用意するVRM一覧 */
const DEFAULT_VRM_LIST: VrmEntry[] = [
  { label: 'ずんだもん', url: '/Zundamon_VRM_10.vrm', isCustom: false },
  { label: 'AvatarSample_B', url: '/AvatarSample_B.vrm', isCustom: false },
];

/** VRM一覧（デフォルト + ユーザー追加分） */
export const vrmListAtom = atom<VrmEntry[]>(DEFAULT_VRM_LIST);

/** 現在選択中のVRM */
export const selectedVrmAtom = atom<VrmEntry>(DEFAULT_VRM_LIST[0]);
