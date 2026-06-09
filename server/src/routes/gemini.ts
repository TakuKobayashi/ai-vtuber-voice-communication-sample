import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Bindings } from '../bindings';
import { JsonEmotionTextParser, SYSTEM_PROMPT } from '../lib/sseStreamParser';

const geminiRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /chat
 *
 * ユーザーメッセージを受け取り、Gemini の返答を SSE ストリームで返す。
 * Groq 版と同一のレスポンス形式を使用する。
 *
 * レスポンス形式 (text/event-stream):
 *   data: {"type":"emotion","value":"happy"}  … 感情（最初の1回）
 *   data: {"type":"delta","value":"テキスト"} … 返答テキストの断片
 *   data: [DONE]                              … 終端
 *
 * モデル: gemini-2.5-flash-lite
 *   - 無料枠が大きく (1500 req/day)、応答速度が速い Gemini の最新 Flash モデル
 */
geminiRouter.post('/chat', async (c) => {
  const body = await c.req.json<{ message: string }>();
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContentStream(body.message);

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async (s) => {
    const parser = new JsonEmotionTextParser();
    for await (const chunk of result.stream) {
      const delta = chunk.text();
      await parser.push(delta, s);
    }
    await s.write('data: [DONE]\n\n');
  });
});

export { geminiRouter };
