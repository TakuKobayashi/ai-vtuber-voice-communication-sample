import { atom } from 'jotai';
import { buildUrl } from '../utils/buildUrl';

export type VrmEntry = {
  /** プルダウン表示名 */
  label: string;
  /** objectURL or 静的パス */
  url: string;
  /** ユーザーが追加したカスタムVRMかどうか */
  isCustom: boolean;
};

// ----------------------------------------------------------------
// assets-manifest.json から VRM 一覧を fetch して初期化する。
// SSG build 時は実行されず、ブラウザ側で初回マウント時に呼ばれる。
// ----------------------------------------------------------------

type VrmManifestEntry = { label: string; path: string };
type AssetsManifest = { vrm: VrmManifestEntry[]; backgrounds: never[] };

let _defaultVrmList: VrmEntry[] = [];

export async function loadDefaultVrmList(): Promise<VrmEntry[]> {
  if (_defaultVrmList.length > 0) return _defaultVrmList;
  try {
    const res = await fetch(buildUrl('/assets-manifest.json'));
    const manifest: AssetsManifest = await res.json();
    _defaultVrmList = manifest.vrm.map((v) => ({
      label: v.label,
      url: buildUrl(v.path),
      isCustom: false,
    }));
  } catch (e) {
    console.error('Failed to load assets-manifest.json', e);
    // フォールバック（マニフェストが存在しない場合）
    _defaultVrmList = [
      { label: 'Zundamon VRM 10', url: buildUrl('/vrm/Zundamon_VRM_10.vrm'), isCustom: false },
    ];
  }
  return _defaultVrmList;
}

/** VRM一覧（デフォルト + ユーザー追加分） */
export const vrmListAtom = atom<VrmEntry[]>([]);

/** 現在選択中のVRM */
export const selectedVrmAtom = atom<VrmEntry | null>(null);
