import { useRef } from 'react';
import { useAtom } from 'jotai';
import { vrmListAtom, selectedVrmAtom, VrmEntry } from '../lib/vrmAtom';

type Props = {
  onVrmChange: (url: string) => void;
};

export function VrmSelector({ onVrmChange }: Props) {
  const [vrmList, setVrmList] = useAtom(vrmListAtom);
  const [selectedVrm, setSelectedVrm] = useAtom(selectedVrmAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const loadCustomVrm = (file: File) => {
    if (!file.name.endsWith('.vrm')) return;
    // 同名ファイルが既に追加済みなら上書き（objectURLは更新）
    const blob = new Blob([file], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const label = file.name.replace(/\.vrm$/i, '');
    const entry: VrmEntry = { label, url, isCustom: true };

    setVrmList((prev) => {
      const filtered = prev.filter((v) => v.label !== label);
      return [...filtered, entry];
    });
    setSelectedVrm(entry);
    onVrmChange(url);
  };

  const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__add__') {
      fileInputRef.current?.click();
      return;
    }
    const entry = vrmList.find((v) => v.url === e.target.value);
    if (!entry) return;
    setSelectedVrm(entry);
    onVrmChange(entry.url);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadCustomVrm(file);
    // 同じファイルを再選択できるようにリセット
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) dropZoneRef.current.style.borderColor = 'rgba(200,160,255,0.9)';
  };

  const onDragLeave = () => {
    if (dropZoneRef.current) dropZoneRef.current.style.borderColor = 'rgba(180,140,220,0.4)';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragLeave();
    const file = e.dataTransfer.files[0];
    if (file) loadCustomVrm(file);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* VRMプルダウン */}
      <select style={selectStyle} value={selectedVrm.url} onChange={onSelectChange}>
        {vrmList.map((v: VrmEntry) => (
          <option key={v.url} value={v.url}>
            {v.isCustom ? `📎 ${v.label}` : `🧊 ${v.label}`}
          </option>
        ))}
        {/* ファイル追加アクション */}
        <option value="__add__">＋ VRMファイルを追加...</option>
      </select>

      {/* ドラッグ&ドロップゾーン */}
      <div
        ref={dropZoneRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '4px 10px',
          border: '1px dashed rgba(180,140,220,0.4)',
          borderRadius: '6px',
          color: 'rgba(200,170,240,0.6)',
          fontSize: '11px',
          cursor: 'pointer',
          transition: 'border-color 0.2s, color 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.color = 'rgba(220,190,255,0.9)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,160,255,0.7)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.color = 'rgba(200,170,240,0.6)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(180,140,220,0.4)';
        }}
      >
        📂 VRMをドロップ
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".vrm"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
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
