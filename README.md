# AI VTuber Voice Communication Sample

VRM 3D アバターにテキストを入力すると、Groq LLM が返答を生成し、VOICEVOX で音声合成してアバターが喋るサンプルプロジェクトです。

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
  ├─ POST /api/groq/chat        ─→ Cloudflare Workers (Hono)
  │      SSE ストリーム返却              └─ Groq API (llama-3.3-70b-versatile)
  │
  ├─ POST /api/voicevox/audio_query  ─→ Cloudflare Workers
  ├─ POST /api/voicevox/synthesis    ─→     └─ VOICEVOX Engine (Cloud Run / ローカル)
  └─ GET  /api/voicevox/speakers     ─→
```

Groq の返答は SSE ストリームで受信し、センテンス（句読点）単位で分割して VOICEVOX 合成を並列実行、合成完了したものから順次アバターに喋らせます。

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
# または docker-compose up -d
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
VOICEVOX_API_ROOT_URL=http://localhost:50021
```

- `GROQ_API_KEY`: [Groq Console](https://console.groq.com/) で取得した API キー
- `VOICEVOX_API_ROOT_URL`: VOICEVOX エンジンの URL（ローカルは `http://localhost:50021`、Cloud Run は本番 URL）

> **注意**: `.dev.vars` は `.gitignore` に含まれており、リポジトリにはコミットされません。

### 3. 開発サーバーの起動

ルートから一発で起動（web ビルド → server 起動）:

```bash
pnpm dev:server
```

または個別に起動:

```bash
# web フロントエンドのみ (Next.js dev server, http://localhost:3000)
pnpm dev:web

# server のみ (Wrangler dev, http://localhost:8787)
pnpm --filter ai-vtuber-voice-communication-sample-server dev
```

---

## ルートの主要スクリプト一覧

```bash
pnpm dev:web          # web フロントエンド開発サーバー起動
pnpm dev:server       # web をビルドしてから server (Wrangler) を起動
pnpm build:web        # web を静的ファイルにビルド (web/out/ に出力)
pnpm deploy:cloudflare  # web ビルド → Cloudflare Workers にデプロイ
pnpm lint             # web の ESLint を実行
pnpm format           # プロジェクト全体を Prettier でフォーマット
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

> Wrangler の設定は `server/wrangler.jsonc` を参照してください。
> 本番環境の環境変数 (`GROQ_API_KEY` など) は Cloudflare Dashboard または `wrangler secret put` で設定してください。

```bash
wrangler secret put GROQ_API_KEY
wrangler secret put VOICEVOX_API_ROOT_URL
```

---

## GitHub Pages へのデプロイ

`.github/workflows/deploy-github-pages.yml` により、main ブランチへの push で自動デプロイされます。

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
data: {"delta":"こん"}
data: {"delta":"にちは"}
data: [DONE]
```

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
Groq SSE stream
  │  delta テキストを受信しながら
  ▼
SentenceBuffer（句読点で分割）
  │  センテンスが確定した瞬間
  ▼
synthesizeAudio()  ←── 並列で合成開始（Promise をキューに積む）
  │
  ▼
synthesisQueue（順序保証キュー）
  │  先頭から順に await → 再生
  ▼
viewer.model.speak()  ←── アバターがリップシンクしながら喋る
```

長い返答でも最初のセンテンスが合成完了した時点で即座に再生が始まり、後続は並列で合成されるため応答体感が大幅に向上します。

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
