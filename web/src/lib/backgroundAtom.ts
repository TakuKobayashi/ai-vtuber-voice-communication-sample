import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { atom } from 'jotai';
import { buildUrl } from '../utils/buildUrl';

export type BackgroundEntry = {
  label: string;
  url: string;
};

type BgManifestEntry = { label: string; path: string };
type AssetsManifest = { vrm: never[]; backgrounds: BgManifestEntry[] };

// モジュールレベルキャッシュを廃止 → 毎回 fetch する（マニフェスト自体は小さいので問題なし）
export async function loadDefaultBackgroundList(): Promise<BackgroundEntry[]> {
  try {
    // cache: 'no-store' でブラウザキャッシュを無効化し、常に最新マニフェストを取得
    const res = await fetch(buildUrl('/assets-manifest.json'), { cache: 'no-store' });
    const manifest: AssetsManifest = await res.json();
    return manifest.backgrounds.map((b) => ({
      label: b.label,
      url: buildUrl(b.path),
    }));
  } catch (e) {
    console.error('Failed to load assets-manifest.json', e);
    return [];
  }
}

/** 背景画像一覧 */
export const backgroundListAtom = atom<BackgroundEntry[]>([]);

/** 現在選択中の背景（null = 背景なし） */
export const selectedBackgroundAtom = atom<BackgroundEntry | null>(null);
