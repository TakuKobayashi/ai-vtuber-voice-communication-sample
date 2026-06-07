import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import Groq from 'groq-sdk';
import type { Bindings } from '../bindings';

const groqRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /chat
 * ユーザーメッセージを受け取り、Groq LLM の返答を SSE ストリームで返す。
 * レスポンスは text/event-stream 形式で、各チャンクを delta テキストとして送出する。
 * ストリーム終端は `[DONE]` イベントで通知する。
 */
groqRouter.post('/chat', async (c) => {
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

export { groqRouter };
