/**
 * generate-assets-manifest.ts
 *
 * ビルド前に実行するスクリプト。
 * public/vrm/       以下の .vrm ファイル
 * public/backgrounds/ 以下の画像ファイル (.jpg/.jpeg/.png/.webp)
 * をスキャンして public/assets-manifest.json を生成する。
 *
 * 実行: tsx scripts/generate-assets-manifest.ts
 */

import fs from 'fs';
import path from 'path';

// ----------------------------------------------------------------
// 設定
// ----------------------------------------------------------------

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'assets-manifest.json');

const VRM_DIR = path.join(PUBLIC_DIR, 'vrm');
const BACKGROUNDS_DIR = path.join(PUBLIC_DIR, 'backgrounds');

const VRM_EXTENSIONS = ['.vrm'];
const BG_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// ファイル名からラベルを生成するシンプルな変換
// 例: "Zundamon_VRM_10.vrm" → "Zundamon VRM 10"
function toLabel(filename: string): string {
  return path.basename(filename, path.extname(filename))
    .replace(/[_\-]+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------
// スキャン
// ----------------------------------------------------------------

function scanDir(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => extensions.includes(path.extname(f).toLowerCase()))
    .sort(); // アルファベット順で安定させる
}

const vrmFiles = scanDir(VRM_DIR, VRM_EXTENSIONS);
const bgFiles = scanDir(BACKGROUNDS_DIR, BG_EXTENSIONS);

// ----------------------------------------------------------------
// マニフェスト構築
// ----------------------------------------------------------------

export type VrmManifestEntry = {
  label: string;
  /** /vrm/Zundamon_VRM_10.vrm のような静的パス */
  path: string;
};

export type BackgroundManifestEntry = {
  label: string;
  /** /backgrounds/ground_bg.jpg のような静的パス */
  path: string;
};

export type AssetsManifest = {
  generatedAt: string;
  vrm: VrmManifestEntry[];
  backgrounds: BackgroundManifestEntry[];
};

const manifest: AssetsManifest = {
  generatedAt: new Date().toISOString(),
  vrm: vrmFiles.map((f) => ({
    label: toLabel(f),
    path: `/vrm/${f}`,
  })),
  backgrounds: bgFiles.map((f) => ({
    label: toLabel(f),
    path: `/backgrounds/${f}`,
  })),
};

// ----------------------------------------------------------------
// 出力
// ----------------------------------------------------------------

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(`✅ assets-manifest.json generated`);
console.log(`   VRM       : ${manifest.vrm.length} files`);
manifest.vrm.forEach((v) => console.log(`              ${v.path}  →  "${v.label}"`));
console.log(`   Backgrounds: ${manifest.backgrounds.length} files`);
manifest.backgrounds.forEach((b) => console.log(`              ${b.path}  →  "${b.label}"`));
