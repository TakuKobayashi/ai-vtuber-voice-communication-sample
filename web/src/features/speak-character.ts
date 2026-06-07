import { EmotionType } from './vrmViewer/model';
import { Viewer } from './vrmViewer/viewer';

const voiceVoxRootUrl = process.env.NEXT_PUBLIC_VOICEVOX_API_ROOT_URL;

export async function loadSpeackers(): Promise<any[]> {
  const speackersResponse = await fetch(`${voiceVoxRootUrl}/speakers`);
  return speackersResponse.json();
}

export async function speakCharacter(
  speackerId: number,
  speakText: string,
  viewer: Viewer,
  expression: EmotionType = 'neutral',
): Promise<void> {
  const audioQueryParams = new URLSearchParams({
    text: speakText,
    speaker: speackerId.toString(),
  });
  const audioQueryUrl = new URL(`${voiceVoxRootUrl}/audio_query`);
  audioQueryUrl.search = audioQueryParams.toString();
  const responseAudioQuery = await fetch(audioQueryUrl.toString(), {
    method: 'POST',
  });
  const responseAudioQueryJson = await responseAudioQuery.json();

  const synthesisQueryParams = new URLSearchParams({
    speaker: speackerId.toString(),
  });
  const synthesisQueryUrl = new URL(`${voiceVoxRootUrl}/synthesis`);
  synthesisQueryUrl.search = synthesisQueryParams.toString();
  const responseSynthesis = await fetch(synthesisQueryUrl.toString(), {
    method: 'POST', // BUG FIX: methodが抜けていたため追加
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(responseAudioQueryJson),
  });
  const responseSynthesisBinary = await responseSynthesis.arrayBuffer();
  return viewer.model?.speak(responseSynthesisBinary, expression);
}
