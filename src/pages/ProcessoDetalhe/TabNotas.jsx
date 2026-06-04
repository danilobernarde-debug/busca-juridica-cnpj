import { useState } from 'react';
import { fmtDataHora } from '../../lib/utils.js';

export default function TabNotas({ notas, onAdd, onDel }) {
  const [texto, setTexto] = useState('');
  const submit = () => { if (!texto.trim()) return; onAdd(texto.trim()); setTexto(''); };
  const sorted = [...notas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label>Nova observação</label>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="Registro de movimentação, decisão, prazo..." onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submit(); }} style={{ marginBottom: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>Ctrl+Enter para salvar</span>
          <button className="btn-primary" onClick={submit} disabled={!texto.trim()}>Salvar nota</button>
        </div>
      </div>
      {sorted.map(n => (
        <div key={n.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.texto}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{n.autor} · {fmtDataHora(n.createdAt)}</div>
          </div>
          <button className="btn-ghost" onClick={() => onDel(n.id)} style={{ alignSelf: 'flex-start', fontSize: 14 }}>✕</button>
        </div>
      ))}
      {notas.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Nenhuma nota registrada.</div>}
    </div>
  );
}
