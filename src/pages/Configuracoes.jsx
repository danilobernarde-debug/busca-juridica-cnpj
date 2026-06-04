import { useState } from 'react';
import { STORAGE_KEY } from '../lib/storage.js';

export default function Configuracoes({ config, onSave, onMigrar, supabaseOk, erroSB }) {
  const [key, setKey] = useState(config.claudeKey || '');
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>⚙️ Configurações</div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 600, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>☁️ Supabase</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          <span style={{ fontSize: 16 }}>{supabaseOk ? '🟢' : '🔴'}</span>
          <span style={{ flex: 1 }}>{supabaseOk ? 'Conectado — dados salvando no Supabase' : (erroSB || 'Não configurado — usando localStorage')}</span>
        </div>
        {supabaseOk && (
          <button className="btn-secondary" onClick={onMigrar}>
            ⬆️ Migrar dados locais para o Supabase
          </button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 600, marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Chave API Claude (Anthropic)</label>
          <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="sk-ant-..." />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Necessária para usar a IA. Obtenha em console.anthropic.com.
          </div>
        </div>
        <button className="btn-primary" onClick={() => onSave({ ...config, claudeKey: key })}>Salvar</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 600 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🗂️ Backup local</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) { alert('Nenhum dado local.'); return; }
            const blob = new Blob([data], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_juridico.json'; a.click();
          }}>⬇️ Exportar backup</button>
          <button className="btn-danger" onClick={() => { if (confirm('Apagar dados locais?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }}>🗑️ Apagar local</button>
        </div>
      </div>
    </div>
  );
}
