import { useAtom } from 'jotai';
import { speakersAtom, selectedSpeakerAtom, selectedSpeakerStyleAtom, Speaker, SpeakerStyle } from '../lib/speakersAtom';

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
  minWidth: '0',
};

export function SpeakerSelector() {
  const [speakers] = useAtom(speakersAtom);
  const [selectedSpeaker, setSelectedSpeaker] = useAtom(selectedSpeakerAtom);
  const [selectedStyle, setSelectedStyle] = useAtom(selectedSpeakerStyleAtom);

  if (!speakers || speakers.length === 0) return null;

  const onSpeakerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const speaker = speakers.find((s) => s.name === e.target.value) ?? null;
    setSelectedSpeaker(speaker);
    // スタイルは先頭をデフォルト選択
    setSelectedStyle(speaker?.styles[0] ?? null);
  };

  const onStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const style = selectedSpeaker?.styles.find((s) => s.id === Number(e.target.value)) ?? null;
    setSelectedStyle(style);
  };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <select style={selectStyle} value={selectedSpeaker?.name ?? ''} onChange={onSpeakerChange}>
        {speakers.map((s: Speaker) => (
          <option key={s.speaker_uuid} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>

      {selectedSpeaker && selectedSpeaker.styles.length > 1 && (
        <select style={selectStyle} value={selectedStyle?.id ?? ''} onChange={onStyleChange}>
          {selectedSpeaker.styles.map((style: SpeakerStyle) => (
            <option key={style.id} value={style.id}>
              {style.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
