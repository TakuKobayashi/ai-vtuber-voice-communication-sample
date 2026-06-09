import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export type AiProvider = 'groq' | 'gemini';

export const AI_PROVIDER_OPTIONS: { value: AiProvider; label: string; description: string }[] = [
  { value: 'groq', label: 'Groq', description: 'llama-3.3-70b-versatile' },
  { value: 'gemini', label: 'Gemini', description: 'gemini-2.5-flash-lite' },
];

const noopStorage = {
  length: 0,
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
} as unknown as Storage;

const persistStorage = createJSONStorage<AiProvider>(() => (typeof window === 'undefined' ? noopStorage : localStorage));

/** 選択中の AI プロバイダー（localStorage 永続化） */
export const aiProviderAtom = atomWithStorage<AiProvider>('selected_ai_provider', 'groq', persistStorage, { getOnInit: true });

/** プロバイダーに対応するチャット API のパスを返す */
export function getApiPath(provider: AiProvider): string {
  return `/api/${provider}/chat`;
}
