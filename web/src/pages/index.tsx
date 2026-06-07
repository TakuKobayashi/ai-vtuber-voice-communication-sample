'use client';

import { useContext, useState, useEffect } from 'react';
import { VrmViewer } from '../compoments/vrmViewer';
import { ViewerContext } from '../features/vrmViewer/viewerContext';
import { IconButton } from '../compoments/iconButton';
import { speakCharacter, loadSpeackers } from '../features/speak-character';

export default function Home() {
  const { viewer } = useContext(ViewerContext);
  const [speakerStyle, setSpeakerStyle] = useState<{ [key: string]: any }>({});
  const [userMessage, setUserMessage] = useState('');

  useEffect(() => {
    (async () => {
      const speakers = await loadSpeackers();
      const targetSpeackerName = 'ずんだもん';
      const targetSpeacker = speakers.find((speacker: any) => speacker.name === targetSpeackerName) || {};
      // 'ノーマル', 'あまあま', 'ツンツン', 'セクシー', 'ささやき', 'ヒソヒソ' がある
      const targetSpeackerStyle = targetSpeacker.styles?.find((style: any) => style.name === 'あまあま');
      if (targetSpeackerStyle) {
        setSpeakerStyle(targetSpeackerStyle);
      }
    })();
  }, []);

  const onTestClick = async () => {
    if (speakerStyle.id) {
      const groqChatResponse = await fetch('/groq/chat', { method: 'POST', body: JSON.stringify({ message: userMessage }) });
      const groqChatResponseJson = await groqChatResponse.json();
      await speakCharacter(speakerStyle.id, userMessage, viewer);
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
                isProcessing={false}
                disabled={false}
                onClick={onTestClick}
              />

              <input
                type="text"
                placeholder="聞きたいことをいれてね"
                onChange={(e) => setUserMessage(e.target.value)}
                disabled={false}
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
                isProcessing={false}
                disabled={userMessage.length <= 0}
                onClick={onTestClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
