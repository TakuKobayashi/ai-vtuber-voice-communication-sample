# AI VTuber Voice Communication Sample

VRM 3D アバターにテキストを入力すると、Groq LLM が返答を生成し、VOICEVOX で音声合成してアバターが喋るサンプルプロジェクトです。

デモページはこちらです

https://ai-vtuber-voice-communication-sample.taptappun.workers.dev/

---

## 主な機能

- **多言語対応 (i18n)**: 画面左上のタブで日本語 / English を切り替え可能。ブラウザ言語を自動判定してデフォルト設定。選択言語は localStorage に保存され、サーバー側のプロンプトにも反映される
- **AI 返答 + 音声合成**: テキストを入力すると Groq LLM が返答を生成し、VOICEVOX がアバターの声で読み上げる
- **感情表現**: LLM が返答と同時に感情（neutral / happy / angry / sad / relaxed）を返し、アバターの表情と VOICEVOX のスタイルに自動反映
- **ストリーミング再生**: Groq の返答を SSE で受信しながら句読点単位で音声合成を並列実行し、順次再生することで応答を体感的に高速化
- **ゲーム風メッセージウィンドウ**: AI の返答テキストをリアルタイムでタイプライター表示
- **VRM アバター差し替え**: プルダウン選択またはファイル追加（ドラッグ&ドロップ）で VRM を差し替え可能
- **背景画像切り替え**: `public/backgrounds/` に置いた画像をプルダウンで選択して背景を変更
- **ボイス選択**: VOICEVOX の話者をプルダウンで選択、感情に応じたスタイルを自動選択
- **会話履歴**: 入力内容・スピーカー・感情・返答を localStorage に記録し、画面右サイドパネルで閲覧
- **設定の永続化**: 背景・VRM・ボイスのプルダウン選択状態を localStorage に保存し、リロード後も復元

---

## 構成

```
.
├── web/        # Next.js フロントエンド (SSG / Cloudflare Workers Static Assets)
├── server/     # Hono + Cloudflare Workers Web API サーバー
└── voicevox/   # ローカル VOICEVOX エンジン起動用 (Docker Compose)
```

### アーキテクチャ概要

```
ブラウザ (Next.js SSG)
  │
  ├─ POST /api/groq/chat             ─→ Cloudflare Workers (Hono)
  │      SSE ストリーム返却                  └─ Groq API (llama-3.3-70b-versatile)
  │
  ├─ POST /api/voicevox/audio_query  ─→ Cloudflare Workers
  ├─ POST /api/voicevox/synthesis    ─→     └─ VOICEVOX Engine (Cloud Run / ローカル)
  └─ GET  /api/voicevox/speakers     ─→
```

### フロントエンド ディレクトリ構成

```
web/
├── public/
│   ├── vrm/           # VRM アバターファイル (.vrm)
│   ├── vrma/          # VRM アニメーションファイル (.vrma)
│   ├── backgrounds/   # 背景画像 (.jpg/.png/.webp)
│   └── assets-manifest.json  # ビルド時自動生成（vrm/backgrounds の一覧）
├── scripts/
│   └── generate-assets-manifest.ts  # assets-manifest.json 生成スクリプト
└── src/
    ├── compoments/
    │   ├── backgroundSelector.tsx  # 背景画像プルダウン
    │   ├── historyPanel.tsx        # 会話履歴サイドパネル
    │   ├── iconButton.tsx          # アイコンボタン
    │   ├── messageWindow.tsx       # ゲーム風メッセージウィンドウ
    │   ├── speakerSelector.tsx     # ボイス（話者）プルダウン + 感情バッジ
    │   ├── vrmSelector.tsx         # VRM プルダウン + ファイル追加モーダル
    │   └── vrmViewer.tsx           # Three.js / VRM レンダリングキャンバス
    ├── features/
    │   ├── speak-character.ts      # 音声合成 / SSE ストリーム処理
    │   └── vrmViewer/              # VRM モデル / アニメーション / リップシンク
    └── lib/
        ├── backgroundAtom.ts       # 背景一覧・選択状態 (jotai)
        ├── historyAtom.ts          # 会話履歴 (jotai + localStorage)
        ├── speakersAtom.ts         # VOICEVOX 話者一覧・選択状態 (jotai)
        └── vrmAtom.ts              # VRM 一覧・選択状態 (jotai)
```

---

## アセット管理

`public/vrm/` や `public/backgrounds/` にファイルを追加するだけで、ビルド時に自動で検出されてプルダウンの選択肢に反映されます。

### VRM ファイル

`public/vrm/` に `.vrm` ファイルを追加してください。ビルド時にファイルの GLB バイナリから VRM メタデータ（`VRMC_vrm.meta.name` または `VRM.meta.title`）を読み取ってプルダウンの表示名として使用します。

### 背景画像

`public/backgrounds/` に `.jpg` / `.jpeg` / `.png` / `.webp` ファイルを追加してください。ファイル名がプルダウンの表示名として使われます。

### アセットマニフェスト生成

上記スキャン結果は `public/assets-manifest.json` に出力されます。`pnpm dev:server` や `pnpm build:web` 実行時に自動生成されるため、手動で編集する必要はありません。

```bash
# 手動で再生成する場合
pnpm --filter ai-vtuber-voice-communication-sample-web generate-manifest
```

---

## 実行環境

| ツール | バージョン |
|--------|-----------|
| Node.js | 18 以上 |
| pnpm | 9 以上 |
| Docker / Docker Compose | VOICEVOX ローカル起動時に必要 |
| Wrangler | pnpm install で自動インストール |

---

## 初期セットアップ

```bash
# リポジトリルートで依存関係を一括インストール
pnpm install
```

---

## ローカル環境での開発

### 1. VOICEVOX の起動

```bash
cd voicevox/
docker compose up -d
```

起動後に以下の URL でアクセス可能です。

| URL | 内容 |
|-----|------|
| http://localhost:50021/docs | VOICEVOX API ドキュメント |
| http://localhost:50021/setting | CORS 設定など |

### 2. サーバー側の環境変数を設定

`server/.dev.vars` を編集します（`.dev.vars.example` をコピーして作成してください）。

```bash
cp server/.dev.vars.example server/.dev.vars
```

`server/.dev.vars`:

```dotenv
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
VOICEVOX_API_ROOT_URL=http://localhost:50021
```

- `GROQ_API_KEY`: [Groq Console](https://console.groq.com/) で取得した API キー
- `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/apikey) で取得した API キー
- `VOICEVOX_API_ROOT_URL`: VOICEVOX エンジンの URL（ローカルは `http://localhost:50021`、Cloud Run は本番 URL）

> `.dev.vars` は `.gitignore` に含まれており、リポジトリにはコミットされません。

### 3. 開発サーバーの起動

```bash
# web ビルド → Wrangler dev サーバー起動 (http://127.0.0.1:8787)
pnpm dev:server
```

個別起動:

```bash
# web フロントエンドのみ (Next.js dev server, http://localhost:3000)
pnpm dev:web

# server のみ (Wrangler dev, http://127.0.0.1:8787)
pnpm --filter ai-vtuber-voice-communication-sample-server dev
```

---

## ルートの主要スクリプト一覧

```bash
pnpm dev:web            # web フロントエンド開発サーバー起動
pnpm dev:server         # web ビルド → server (Wrangler) を起動
pnpm build:web          # web を静的ファイルにビルド (web/out/ に出力)
pnpm deploy:cloudflare  # web ビルド → Cloudflare Workers にデプロイ
pnpm lint               # web の ESLint を実行
pnpm format             # プロジェクト全体を Prettier でフォーマット
```

---

## Cloudflare Workers へのデプロイ

```bash
pnpm deploy:cloudflare
```

内部では以下の順で実行されます:

1. `web/` を Next.js SSG でビルド → `web/out/` に静的ファイルを出力
2. Wrangler が `web/out/` を Static Assets としてアップロード
3. `server/src/index.ts` を Worker としてデプロイ

本番環境の環境変数は Cloudflare Workers のシークレットとして登録します（GitHub Actions から自動登録されます）。

```bash
# 手動で設定する場合
cd server
wrangler secret put GROQ_API_KEY
wrangler secret put VOICEVOX_API_ROOT_URL
```

---

## GitHub Actions による自動デプロイ

### Cloudflare Workers (`deploy-cloudflare.yml`)

`master` ブランチへの push で自動デプロイされます。事前に以下の Secrets を GitHub リポジトリに登録してください。

| Secret 名 | 取得元 |
|-----------|--------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → 「Edit Cloudflare Workers」テンプレートで作成 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → 右サイドバーの Account ID |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/) で取得した API キー |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) で取得した API キー |
| `VOICEVOX_API_ROOT_URL` | VOICEVOX エンジンの URL（例: `https://voicevox-engine-xxx.run.app`） |

### GitHub Pages (`deploy-github-pages.yml`)

`master` ブランチへの push で自動デプロイされます。`ACTIONS_DEPLOY_KEY` Secret の登録が必要です。

---

## Web API エンドポイント一覧

すべてのエンドポイントは `/api/` プレフィックスを持ちます（Cloudflare Workers の静的アセット配信と共存するため）。

### Groq

| メソッド | パス | 説明 |
|----------|------|------|
| `POST` | `/api/groq/chat` | メッセージを送信し、LLM の返答を SSE ストリームで取得 |

リクエスト:
```json
{ "message": "こんにちは" }
```

レスポンス (text/event-stream):
```
data: {"type":"emotion","value":"happy"}
data: {"type":"delta","value":"こんにちは！"}
data: {"type":"delta","value":"元気ですよ。"}
data: [DONE]
```

感情 (`emotion`) の値域: `neutral` / `happy` / `angry` / `sad` / `relaxed`

### VoiceVox プロキシ

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/voicevox/speakers` | 話者一覧を取得 |
| `POST` | `/api/voicevox/audio_query?text=...&speaker=...` | 音声合成クエリを生成 |
| `POST` | `/api/voicevox/synthesis?speaker=...` | WAV 音声を合成して返す |
| `GET` | `/api/voicevox/version` | VOICEVOX エンジンバージョン |
| `GET` | `/api/voicevox/engine_manifest` | エンジンマニフェスト |

---

## ストリーミング音声合成の仕組み

```
POST /api/groq/chat (SSE)
  │
  ├─ {"type":"emotion","value":"happy"}  →  アバター表情切り替え + 感情バッジ更新
  │
  └─ {"type":"delta","value":"テキスト断片"}
       │
       ├─ メッセージウィンドウにリアルタイム追記
       │
       └─ SentenceBuffer（句読点で分割）
            │ センテンス確定の瞬間
            ▼
          resolveStyleId(speaker, emotion)  →  感情に対応した VOICEVOX スタイルID を解決
            │
            ▼
          synthesizeAudio()  ←── 並列で合成開始（Promise をキューに積む）
            │
            ▼
          synthesisQueue（順序保証キュー）
            │ 先頭から順に await → 再生
            ▼
          viewer.model.speak()  ←── アバターがリップシンクしながら喋る
```

### 感情 → VOICEVOX スタイル マッピング

| 感情 | 優先スタイル順 |
|------|--------------|
| happy | あまあま → ノーマル |
| angry | ツンツン → ノーマル |
| sad | ささやき → ヒソヒソ → ノーマル |
| relaxed | ノーマル → あまあま |
| neutral | ノーマル |

---

## localStorage に保存される情報

| キー | 内容 | 有効期限 |
|------|------|---------|
| `voicevox_speakers_cache` | VOICEVOX 話者一覧キャッシュ | 12 時間 |
| `selected_ai_provider` | 最後に選択した AI プロバイダー（`groq` / `gemini`） | 永続 |
| `selected_locale` | 表示言語（`ja` / `en`）。未設定時はブラウザ言語から自動判定 | 永続 |
| `selected_bg_path` | 最後に選択した背景画像のパス | 永続 |
| `selected_vrm_path` | 最後に選択した VRM のパス（デフォルト VRM のみ） | 永続 |
| `selected_speaker_name` | 最後に選択した話者名 | 永続 |
| `ai_vtuber_history` | 会話履歴（入力・返答・感情・スピーカー） | 永続（手動クリア） |

---

## 各種使用ツールや素材一覧

* [VOICEVOX](https://voicevox.hiroshiba.jp/)
* [ずんだもんVRM](https://booth.pm/ja/items/3733351)
* 背景画像
  * [学校のグラウンド（4枚）](https://min-chi.material.jp/fm/bg_c/school_ground/)
  * [和風の家の玄関ホール（2枚）](https://min-chi.material.jp/fm/bg_c/jp_entrance_hall/)
  * [飲食店の店内（3枚）](https://min-chi.material.jp/fm/bg_c/casual_restaurant/)
* [ChatVRM 記事](https://inside.pixiv.blog/2023/04/28/160000)
* [ChatVRM Github](https://github.com/pixiv/ChatVRM)
