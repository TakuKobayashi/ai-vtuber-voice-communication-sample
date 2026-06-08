import { atom } from 'jotai';
import { buildUrl } from '../utils/buildUrl';

export type BackgroundEntry = {
  label: string;
  url: string;
};

type BgManifestEntry = { label: string; path: string };
type AssetsManifest = { vrm: never[]; backgrounds: BgManifestEntry[] };

let _defaultBgList: BackgroundEntry[] = [];

export async function loadDefaultBackgroundList(): Promise<BackgroundEntry[]> {
  if (_defaultBgList.length > 0) return _defaultBgList;
  try {
    const res = await fetch(buildUrl('/assets-manifest.json'));
    const manifest: AssetsManifest = await res.json();
    _defaultBgList = manifest.backgrounds.map((b) => ({
      label: b.label,
      url: buildUrl(b.path),
    }));
  } catch (e) {
    console.error('Failed to load assets-manifest.json', e);
    _defaultBgList = [];
  }
  return _defaultBgList;
}

/** 背景画像一覧 */
export const backgroundListAtom = atom<BackgroundEntry[]>([]);

/** 現在選択中の背景（null = 背景なし） */
export const selectedBackgroundAtom = atom<BackgroundEntry | null>(null);
