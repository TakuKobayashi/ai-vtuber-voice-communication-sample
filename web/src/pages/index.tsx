'use client';

import { useContext, useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { VrmViewer } from '../compoments/vrmViewer';
import { ViewerContext } from '../features/vrmViewer/viewerContext';
import { IconButton } from '../compoments/iconButton';
import { speakCharacter, loadSpeackers } from '../features/speak-character';
import { speakersAtom, SpeakerStyle } from '../lib/speakersAtom';

export default function Home() {
  const { viewer } = useContext(ViewerContext);
  const [speakers, setSpeakers] = useAtom(speakersAtom);
  const [speakerStyle, setSpeakerStyle] = useState<SpeakerStyle | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      // jotai atom にキャッシュ済みならAPIを叩かない
      const speakerList = speakers ?? (await loadSpeackers());
      if (!speakers) {
        setSpeakers(speakerList);
      }

      const targetSpeackerName = 'ずんだもん';
      const targetSpeacker = speakerList.find((s: any) => s.name === targetSpeackerName) ?? {};
      // 'ノーマル', 'あまあま', 'ツンツン', 'セクシー', 'ささやき', 'ヒソヒソ' がある
      const targetSpeackerStyle = targetSpeacker.styles?.find((style: any) => style.name === 'あまあま');
      if (targetSpeackerStyle) {
        setSpeakerStyle(targetSpeackerStyle);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSendClick = async () => {
    if (!speakerStyle?.id || !userMessage || isProcessing) return;

    setIsProcessing(true);
    try {
      // Groq API 経由でAIの返答を取得 (/api プレフィックス必須: CF Workers の静的アセットと共存するため)
      const groqChatResponse = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!groqChatResponse.ok) {
        console.error('Groq API error:', groqChatResponse.status, await groqChatResponse.text());
        return;
      }

      const groqChatResponseJson = await groqChatResponse.json();
      // BUG FIX: userMessage ではなく AIの返答テキストをしゃべらせる
      const aiReplyText: string = groqChatResponseJson?.choices?.[0]?.message?.content ?? '';

      if (aiReplyText) {
        await speakCharacter(speakerStyle.id, aiReplyText, viewer);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={'font-M_PLUS_2'}>
      <VrmViewer />
      <div style={{ position: 'absolute', bottom: 0, zIndex: 20, width: '100vw' }}>
        <div style={{ backgroundColor: 'rgb(251,226,202)', color: '#000000' }}>
          <div style={{ marginLeft: 'auto', marginRight: 'auto', maxWidth: '56rem', padding: '16px' }}>
            <div style={{ display: 'grid', gridAutoFlow: 'column', gap: '8px', gridTemplateColumns: 'min-content 1fr min-content' }}>
              <IconButton
                iconName="24/Microphone"
                style={{
                  backgroundColor: 'rgb(255,97,127)',
                }}
                className="bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled"
                isProcessing={isProcessing}
                disabled={isProcessing}
                onClick={onSendClick}
              />

              <input
                type="text"
                placeholder="聞きたいことをいれてね"
                onChange={(e) => setUserMessage(e.target.value)}
                disabled={isProcessing}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: 'rgb(81,64,98)',
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontWeight: 700,
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  borderRadius: '16px',
                  width: '100%',
                }}
                className="bg-surface1 hover:bg-surface1-hover focus:bg-surface1 disabled:bg-surface1-disabled disabled:text-primary-disabled rounded-16 w-full px-16 text-text-primary typography-16 font-bold disabled"
                value={userMessage}
              ></input>

              <IconButton
                iconName="24/Send"
                style={{
                  backgroundColor: 'rgb(255,97,127)',
                }}
                className="bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled"
                isProcessing={isProcessing}
                disabled={userMessage.length <= 0 || isProcessing}
                onClick={onSendClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
