'use client';

import { useContext, useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { VrmViewer } from '../compoments/vrmViewer';
import { ViewerContext } from '../features/vrmViewer/viewerContext';
import { IconButton } from '../compoments/iconButton';
import { SpeakerSelector } from '../compoments/speakerSelector';
import { MessageWindow } from '../compoments/messageWindow';
import { loadSpeackers, speakCharacterStream } from '../features/speak-character';
import { speakersAtom, selectedSpeakerAtom, selectedSpeakerStyleAtom } from '../lib/speakersAtom';
import { EmotionType } from '../features/vrmViewer/model';

export default function Home() {
  const { viewer } = useContext(ViewerContext);

  // ── スピーカー関連 ──
  const [speakers, setSpeakers] = useAtom(speakersAtom);
  const [, setSelectedSpeaker] = useAtom(selectedSpeakerAtom);
  const [selectedStyle, setSelectedStyle] = useAtom(selectedSpeakerStyleAtom);

  // ── UI 状態 ──
  const [userMessage, setUserMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── メッセージウィンドウ ──
  const [messageText, setMessageText] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');

  // ── 初期化: スピーカー一覧を取得してデフォルト選択 ──
  useEffect(() => {
    (async () => {
      const speakerList = speakers ?? (await loadSpeackers());
      if (!speakers) setSpeakers(speakerList);

      // デフォルト: ずんだもん あまあま
      const defaultSpeaker = speakerList.find((s: any) => s.name === 'ずんだもん') ?? speakerList[0];
      const defaultStyle =
        defaultSpeaker?.styles.find((s: any) => s.name === 'あまあま') ?? defaultSpeaker?.styles[0] ?? null;

      setSelectedSpeaker(defaultSpeaker ?? null);
      setSelectedStyle(defaultStyle);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 送信処理 ──
  const onSendClick = useCallback(async () => {
    if (!selectedStyle?.id || !userMessage || isProcessing) return;

    setIsProcessing(true);
    setMessageText('');
    setCurrentEmotion('neutral');

    try {
      const groqChatResponse = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!groqChatResponse.ok) {
        console.error('Groq API error:', groqChatResponse.status, await groqChatResponse.text());
        return;
      }

      await speakCharacterStream(
        selectedStyle.id,
        groqChatResponse,
        viewer,
        // onEmotion: 感情確定時
        (emotion) => setCurrentEmotion(emotion),
        // onDelta: テキスト断片をメッセージウィンドウに随時追記
        (delta) => setMessageText((prev) => prev + delta),
      );
    } finally {
      setIsProcessing(false);
    }
  }, [selectedStyle, userMessage, isProcessing, viewer]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSendClick();
  };

  return (
    <div className="font-M_PLUS_2">
      <VrmViewer />

      {/* ── メッセージウィンドウ（VRMの前面・入力欄の上） ── */}
      <div style={messageWindowWrapStyle}>
        <MessageWindow text={messageText} emotion={currentEmotion} isProcessing={isProcessing} />
      </div>

      {/* ── 入力エリア ── */}
      <div style={inputAreaOuterStyle}>
        <div style={inputAreaInnerStyle}>
          {/* スピーカー選択 */}
          <div style={{ marginBottom: '8px' }}>
            <SpeakerSelector />
          </div>

          {/* テキスト入力行 */}
          <div style={{ display: 'grid', gridAutoFlow: 'column', gap: '8px', gridTemplateColumns: 'min-content 1fr min-content' }}>
            <IconButton
              iconName="24/Microphone"
              style={{ backgroundColor: 'rgb(255,97,127)' }}
              className="bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled"
              isProcessing={isProcessing}
              disabled={isProcessing}
              onClick={onSendClick}
            />

            <input
              type="text"
              placeholder="聞きたいことをいれてね"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isProcessing}
              style={inputStyle}
            />

            <IconButton
              iconName="24/Send"
              style={{ backgroundColor: 'rgb(255,97,127)' }}
              className="bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled"
              isProcessing={isProcessing}
              disabled={userMessage.length <= 0 || isProcessing}
              onClick={onSendClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// スタイル定義
// ────────────────────────────────────────────────

const messageWindowWrapStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '120px', // 入力欄の高さ分上にずらす
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(680px, 92vw)',
  zIndex: 30,
};

const inputAreaOuterStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  zIndex: 20,
  width: '100vw',
  backgroundColor: 'rgb(251,226,202)',
  color: '#000000',
};

const inputAreaInnerStyle: React.CSSProperties = {
  marginLeft: 'auto',
  marginRight: 'auto',
  maxWidth: '56rem',
  padding: '12px 16px',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  color: 'rgb(81,64,98)',
  fontSize: '16px',
  lineHeight: '24px',
  fontWeight: 700,
  paddingLeft: '16px',
  paddingRight: '16px',
  borderRadius: '16px',
  width: '100%',
  border: 'none',
  outline: 'none',
};
