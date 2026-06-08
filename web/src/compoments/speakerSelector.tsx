import { useAtom } from 'jotai';
import { speakersAtom, selectedSpeakerAtom, resolveStyleName, Speaker } from '../lib/speakersAtom';
import { EmotionType } from '../features/vrmViewer/model';

type Props = {
  /** 現在の感情（合成中スタイル名の表示に使う） */
  currentEmotion: EmotionType;
  /** 合成処理中かどうか（バッジのアニメーション制御） */
  isProcessing: boolean;
};

const EMOTION_LABEL: Record<EmotionType, string> = {
  neutral: 'ノーマル',
  happy: 'うれしい',
  angry: 'おこ',
  sad: 'かなしい',
  relaxed: 'おだやか',
};

const EMOTION_COLOR: Record<EmotionType, string> = {
  neutral: 'rgba(160,140,200,0.25)',
  happy: 'rgba(249,213,110,0.25)',
  angry: 'rgba(249,112,112,0.25)',
  sad: 'rgba(122,176,232,0.25)',
  relaxed: 'rgba(136,224,176,0.25)',
};

const EMOTION_BORDER: Record<EmotionType, string> = {
  neutral: 'rgba(160,140,200,0.6)',
  happy: 'rgba(249,213,110,0.7)',
  angry: 'rgba(249,112,112,0.7)',
  sad: 'rgba(122,176,232,0.7)',
  relaxed: 'rgba(136,224,176,0.7)',
};

const EMOTION_TEXT: Record<EmotionType, string> = {
  neutral: '#c8b8e8',
  happy: '#f9d56e',
  angry: '#f97070',
  sad: '#7ab0e8',
  relaxed: '#88e0b0',
};

export function SpeakerSelector({ currentEmotion, isProcessing }: Props) {
  const [speakers] = useAtom(speakersAtom);
  const [selectedSpeaker, setSelectedSpeaker] = useAtom(selectedSpeakerAtom);

  if (!speakers || speakers.length === 0) return null;

  const onSpeakerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const speaker = speakers.find((s: Speaker) => s.name === e.target.value) ?? null;
    setSelectedSpeaker(speaker);
  };

  // 現在の感情で実際に使われるスタイル名を表示用に解決
  const currentStyleName = selectedSpeaker ? resolveStyleName(selectedSpeaker, currentEmotion) : null;

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* キャラクター選択（スタイルは表示しない） */}
      <select
        style={selectStyle}
        value={selectedSpeaker?.name ?? ''}
        onChange={onSpeakerChange}
      >
        {speakers.map((s: Speaker) => (
          <option key={s.speaker_uuid} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>

      {/* 現在の感情 + 合成に使われるスタイル名バッジ */}
      {currentStyleName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: EMOTION_COLOR[currentEmotion],
            border: `1px solid ${EMOTION_BORDER[currentEmotion]}`,
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '12px',
            fontWeight: 600,
            color: EMOTION_TEXT[currentEmotion],
            transition: 'all 0.3s ease',
            opacity: isProcessing ? 1 : 0.7,
          }}
        >
          {/* 処理中はドット点滅、それ以外は感情ラベル */}
          {isProcessing && (
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: EMOTION_TEXT[currentEmotion], animation: 'blink 1s step-end infinite' }} />
          )}
          <span>{EMOTION_LABEL[currentEmotion]}</span>
          <span style={{ opacity: 0.6 }}>／</span>
          <span>{currentStyleName}</span>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'rgba(30, 18, 50, 0.85)',
  color: '#e8d9f5',
  border: '1px solid rgba(180, 140, 220, 0.6)',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  outline: 'none',
};
