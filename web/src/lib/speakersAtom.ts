import { atom } from 'jotai';

export type SpeakerStyle = {
  id: number;
  name: string;
  type?: string;
};

export type Speaker = {
  name: string;
  speaker_uuid: string;
  styles: SpeakerStyle[];
  version?: string;
};

/** Voicevox から取得したスピーカー一覧キャッシュ */
export const speakersAtom = atom<Speaker[] | null>(null);

/** 現在選択中のスピーカー */
export const selectedSpeakerAtom = atom<Speaker | null>(null);

/** 現在選択中のスタイル */
export const selectedSpeakerStyleAtom = atom<SpeakerStyle | null>(null);
