import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HonoRequest } from 'hono';
import { env } from 'hono/adapter';
import Groq from 'groq-sdk';

const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => {
  return c.json({
    message: 'Hello World',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/groq/chat', async (c) => {
  const bodyJson = await parseJsonBody(c.req);
  const { GROQ_API_KEY } = env(c);
  const groq = new Groq({ apiKey: GROQ_API_KEY as string });
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: bodyJson.message,
      },
    ],
    model: 'llama-3.3-70b-versatile',
  });
  return c.json(chatCompletion);
});

async function parseJsonBody(req: HonoRequest): Promise<any> {
  const bodyText = await req.text();
  if (bodyText) {
    try {
      return JSON.parse(bodyText);
    } catch (e) {
      return {};
    }
  }
  return {};
}

export default app;
