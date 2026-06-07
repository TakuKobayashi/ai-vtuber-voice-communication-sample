import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from 'hono/adapter';
import { stream } from 'hono/streaming';
import Groq from 'groq-sdk';

// ----------------------------------------------------------------
// 型定義
// ----------------------------------------------------------------
type Bindings = {
  GROQ_API_KEY: string;
  VOICEVOX_API_ROOT_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

// ----------------------------------------------------------------
// ヘルスチェック
// ----------------------------------------------------------------
app.get('/', (c) => {
  return c.json({
    message: 'Hello World',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------------------
// Groq API
// ----------------------------------------------------------------

/**
 * POST /api/groq/chat
 * ユーザーメッセージを受け取り、Groq LLM の返答を SSE ストリームで返す。
 * レスポンスは text/event-stream 形式で、各チャンクを delta テキストとして送出する。
 * ストリーム終端は `[DONE]` イベントで通知する。
 */
app.post('/api/groq/chat', async (c) => {
  const body = await c.req.json<{ message: string }>();
  const groq = new Groq({ apiKey: c.env.GROQ_API_KEY });

  const chatStream = await groq.chat.completions.create({
    messages: [{ role: 'user', content: body.message }],
    model: 'llama-3.3-70b-versatile',
    stream: true,
  });

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async (s) => {
    for await (const chunk of chatStream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        await s.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }
    await s.write('data: [DONE]\n\n');
  });
});

// ----------------------------------------------------------------
// VoiceVox プロキシ API
// VoiceVox は外部サービスなので server 側でプロキシする。
// CORS 回避 / API キー集約のため /api/voicevox/* に透過転送する。
// ----------------------------------------------------------------

/**
 * GET /api/voicevox/speakers
 * VoiceVox の話者一覧を返す。
 */
app.get('/api/voicevox/speakers', async (c) => {
  const voicevoxRoot = c.env.VOICEVOX_API_ROOT_URL;
  const res = await fetch(`${voicevoxRoot}/speakers`);
  const data = await res.json();
  return c.json(data);
});

/**
 * POST /api/voicevox/audio_query
 * テキストと speaker ID から音声合成クエリを生成する。
 * query params: text, speaker
 */
app.post('/api/voicevox/audio_query', async (c) => {
  const voicevoxRoot = c.env.VOICEVOX_API_ROOT_URL;
  const { text, speaker } = c.req.query();
  const url = new URL(`${voicevoxRoot}/audio_query`);
  url.searchParams.set('text', text);
  url.searchParams.set('speaker', speaker);
  const res = await fetch(url.toString(), { method: 'POST' });
  const data = await res.json();
  return c.json(data);
});

/**
 * POST /api/voicevox/synthesis
 * audio_query の結果から WAV 音声を合成して返す。
 * query params: speaker
 */
app.post('/api/voicevox/synthesis', async (c) => {
  const voicevoxRoot = c.env.VOICEVOX_API_ROOT_URL;
  const { speaker } = c.req.query();
  const audioQuery = await c.req.json();
  const url = new URL(`${voicevoxRoot}/synthesis`);
  url.searchParams.set('speaker', speaker);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioQuery),
  });
  const arrayBuffer = await res.arrayBuffer();
  return new Response(arrayBuffer, {
    headers: { 'Content-Type': 'audio/wav' },
  });
});

/**
 * GET /api/voicevox/version
 * VoiceVox エンジンのバージョンを返す。
 */
app.get('/api/voicevox/version', async (c) => {
  const voicevoxRoot = c.env.VOICEVOX_API_ROOT_URL;
  const res = await fetch(`${voicevoxRoot}/version`);
  const data = await res.json();
  return c.json(data);
});

/**
 * GET /api/voicevox/engine_manifest
 * VoiceVox エンジンマニフェストを返す。
 */
app.get('/api/voicevox/engine_manifest', async (c) => {
  const voicevoxRoot = c.env.VOICEVOX_API_ROOT_URL;
  const res = await fetch(`${voicevoxRoot}/engine_manifest`);
  const data = await res.json();
  return c.json(data);
});

export default app;
