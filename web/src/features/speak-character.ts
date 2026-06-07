import { EmotionType } from './vrmViewer/model';
import { Viewer } from './vrmViewer/viewer';

// VoiceVox は server 側の /api/voicevox/* プロキシ経由で呼ぶ
const voiceVoxApiBase = '/api/voicevox';

// ----------------------------------------------------------------
// VoiceVox Speakers
// ----------------------------------------------------------------

export async function loadSpeackers(): Promise<any[]> {
  const res = await fetch(`${voiceVoxApiBase}/speakers`);
  return res.json();
}

// ----------------------------------------------------------------
// 単一テキストをしゃべらせる（内部ユーティリティ）
// ----------------------------------------------------------------

async function synthesizeAudio(speackerId: number, text: string): Promise<ArrayBuffer> {
  // Step 1: audio_query
  const audioQueryUrl = new URL(`${location.origin}${voiceVoxApiBase}/audio_query`);
  audioQueryUrl.searchParams.set('text', text);
  audioQueryUrl.searchParams.set('speaker', speackerId.toString());
  const audioQueryRes = await fetch(audioQueryUrl.toString(), { method: 'POST' });
  const audioQuery = await audioQueryRes.json();

  // Step 2: synthesis
  const synthesisUrl = new URL(`${location.origin}${voiceVoxApiBase}/synthesis`);
  synthesisUrl.searchParams.set('speaker', speackerId.toString());
  const synthesisRes = await fetch(synthesisUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioQuery),
  });
  return synthesisRes.arrayBuffer();
}

// ----------------------------------------------------------------
// 単一テキストをしゃべらせる（公開API・後方互換）
// ----------------------------------------------------------------

export async function speakCharacter(
  speackerId: number,
  speakText: string,
  viewer: Viewer,
  expression: EmotionType = 'neutral',
): Promise<void> {
  const buffer = await synthesizeAudio(speackerId, speakText);
  return viewer.model?.speak(buffer, expression);
}

// ----------------------------------------------------------------
// Groq SSE ストリームを受け取り、文単位で並列合成→順次再生する
//
// 仕組み:
//   1. Groq から delta テキストをストリームで受信しながらセンテンスに分割
//   2. センテンスが確定した瞬間に VoiceVox 合成を非同期で開始（Promise をキューに積む）
//   3. キューを先頭から順に await して、合成完了次第すぐ再生
//      → 後のセンテンスが先に合成完了しても、順番通りに再生される
// ----------------------------------------------------------------

/** SSE ストリームから delta 文字列を順に yield するジェネレータ */
async function* readGroqStream(response: Response): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload) as { delta: string };
        if (parsed.delta) yield parsed.delta;
      } catch {
        // malformed chunk — skip
      }
    }
  }
}

/**
 * 句読点・改行でセンテンスの区切りを検出するシンプルな分割器。
 * テキストを蓄積して、区切りが見つかったらセンテンスとして返す。
 */
class SentenceBuffer {
  private buf = '';
  // 句読点（日本語・英語）・改行を区切りとする
  private static readonly DELIMITERS = /[。．！？!?\n]/;

  push(text: string): string[] {
    this.buf += text;
    const results: string[] = [];
    let pos: number;
    while ((pos = this.findDelimiter()) !== -1) {
      const sentence = this.buf.slice(0, pos + 1).trim();
      this.buf = this.buf.slice(pos + 1);
      if (sentence.length > 0) results.push(sentence);
    }
    return results;
  }

  flush(): string[] {
    const remaining = this.buf.trim();
    this.buf = '';
    return remaining.length > 0 ? [remaining] : [];
  }

  private findDelimiter(): number {
    for (let i = 0; i < this.buf.length; i++) {
      if (SentenceBuffer.DELIMITERS.test(this.buf[i])) return i;
    }
    return -1;
  }
}

/**
 * Groq SSE ストリームを受け取り、センテンス単位で並列合成→順次再生する。
 *
 * @param speackerId   VoiceVox の話者 ID
 * @param groqResponse /api/groq/chat の Response (SSE)
 * @param viewer       Viewer インスタンス
 * @param expression   感情表現
 * @returns 全センテンスの再生が完了したら resolve する Promise
 */
export async function speakCharacterStream(
  speackerId: number,
  groqResponse: Response,
  viewer: Viewer,
  expression: EmotionType = 'neutral',
): Promise<void> {
  // 合成 Promise のキュー（順序保証のため）
  const synthesisQueue: Promise<ArrayBuffer>[] = [];
  const sentenceBuffer = new SentenceBuffer();

  /** センテンスが確定したら即座に合成を開始してキューに積む */
  const enqueueSynthesis = (sentence: string) => {
    synthesisQueue.push(synthesizeAudio(speackerId, sentence));
  };

  // SSE を読みながらセンテンス分割・合成開始
  for await (const delta of readGroqStream(groqResponse)) {
    const sentences = sentenceBuffer.push(delta);
    for (const s of sentences) enqueueSynthesis(s);
  }
  // バッファに残った末尾テキストを flush
  for (const s of sentenceBuffer.flush()) enqueueSynthesis(s);

  // キューを先頭から順に再生（後のセンテンスが先に合成済みでも順番通り）
  for (const synthesisPromise of synthesisQueue) {
    const buffer = await synthesisPromise;
    await viewer.model?.speak(buffer, expression);
  }
}
