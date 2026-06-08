import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import Groq from 'groq-sdk';
import type { Bindings } from '../bindings';

const groqRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /chat
 *
 * ユーザーメッセージを受け取り、Groq LLM の返答を SSE ストリームで返す。
 *
 * レスポンス形式 (text/event-stream):
 *   - `data: {"type":"emotion","value":"happy"}`  … 感情（最初の1回）
 *   - `data: {"type":"delta","value":"テキスト"}` … 返答テキストの断片
 *   - `data: [DONE]`                              … 終端
 *
 * LLM には以下の JSON 形式で返答するよう指示する:
 *   {"emotion":"happy","text":"返答内容"}
 *
 * emotion の値域: neutral / happy / angry / sad / relaxed
 * (VRM ExpressionPresetName と一致させる)
 */
groqRouter.post('/chat', async (c) => {
  const body = await c.req.json<{ message: string }>();
  const groq = new Groq({ apiKey: c.env.GROQ_API_KEY });

  const systemPrompt = `You are a friendly AI assistant speaking Japanese.
Always respond ONLY with a single JSON object in the following format, with no extra text outside the JSON:
{"emotion":"<emotion>","text":"<your response in Japanese>"}

emotion must be one of: neutral, happy, angry, sad, relaxed
Choose the emotion that best matches the mood of your response.
The "text" field must contain your full response in natural Japanese.`;

  const chatStream = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: body.message },
    ],
    model: 'llama-3.3-70b-versatile',
    stream: true,
  });

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async (s) => {
    // ストリームで届く JSON 断片を蓄積して parse する
    let rawBuf = '';
    let emotionSent = false;
    // emotion フィールドを抽出して一度だけ送出する
    // text フィールドの値を随時 delta として送出する
    // state machine: 'before_text' | 'in_text' | 'done'
    let state: 'before_text' | 'in_text' | 'done' = 'before_text';
    // text フィールドの値として確定した文字だけを流す
    // JSON 文字列の escape sequence をデコードするため小バッファを持つ
    let textBuf = '';

    for await (const chunk of chatStream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (!delta) continue;
      rawBuf += delta;

      // ── emotion を最初の1回だけ抽出して送信 ──
      if (!emotionSent) {
        const emotionMatch = rawBuf.match(/"emotion"\s*:\s*"([^"]+)"/);
        if (emotionMatch) {
          const emotion = emotionMatch[1];
          await s.write(`data: ${JSON.stringify({ type: 'emotion', value: emotion })}\n\n`);
          emotionSent = true;
        }
      }

      // ── "text": " を探して、以降の文字を delta として流す ──
      if (state === 'before_text') {
        // "text" キーの開始クォートを探す
        const textKeyIdx = rawBuf.indexOf('"text"');
        if (textKeyIdx !== -1) {
          // コロンとオープンクォートを飛ばす
          const afterKey = rawBuf.slice(textKeyIdx + 6);
          const colonAndQuote = afterKey.match(/^\s*:\s*"/);
          if (colonAndQuote) {
            // text 値の本体開始位置
            rawBuf = afterKey.slice(colonAndQuote[0].length);
            state = 'in_text';
          }
        }
      }

      if (state === 'in_text') {
        // rawBuf から終端 `"` (エスケープされていないもの) を探しながら流す
        let i = 0;
        while (i < rawBuf.length) {
          const ch = rawBuf[i];
          if (ch === '\\' && i + 1 < rawBuf.length) {
            // エスケープ処理
            const next = rawBuf[i + 1];
            const decoded: Record<string, string> = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' };
            textBuf += decoded[next] ?? next;
            i += 2;
          } else if (ch === '"') {
            // text 値の終端
            state = 'done';
            i++;
            break;
          } else {
            textBuf += ch;
            i++;
          }
        }
        rawBuf = rawBuf.slice(i);

        // textBuf に溜まった文字を delta として送信
        if (textBuf.length > 0) {
          await s.write(`data: ${JSON.stringify({ type: 'delta', value: textBuf })}\n\n`);
          textBuf = '';
        }
      }
    }

    await s.write('data: [DONE]\n\n');
  });
});

export { groqRouter };
