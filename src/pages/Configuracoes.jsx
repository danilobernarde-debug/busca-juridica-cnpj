import { useState } from 'react';
import { STORAGE_KEY } from '../lib/storage.js';


function validarFormatoChave(key) {
  if (!key) return { ok: false, msg: 'Nenhuma chave informada.' };
  if (!key.startsWith('sk-ant-')) return { ok: false, msg: 'Formato inválido — a chave deve começar com sk-ant-' };
  if (key.length < 40) return { ok: false, msg: 'Chave muito curta.' };
  return { ok: true };
}

export default function Configuracoes({ config, onSave, onMigrar, supabaseOk, erroSB }) {
  const [key, setKey] = useState(config.claudeKey || '');
  const [statusClaude, setStatusClaude] = useState(null);

  const handleVerificar = () => {
    const resultado = validarFormatoChave(key.trim());
    setStatusClaude(resultado);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>⚙️ Configurações</div>

      {/* Supabase */}
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

      {/* Claude */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 600, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>🤖 Claude (Anthropic)</div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Chave API</label>
          <input type="password" value={key} onChange={e => { setKey(e.target.value); setStatusClaude(null); }} placeholder="sk-ant-..." />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Necessária para usar a IA. Obtenha em{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
              console.anthropic.com
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: statusClaude ? 16 : 0 }}>
          <button className="btn-primary" onClick={() => onSave({ ...config, claudeKey: key })}>Salvar</button>
          <button className="btn-secondary" onClick={handleVerificar} disabled={!key.trim()}>
            🔍 Verificar formato
          </button>
        </div>

        {/* Resultado */}
        {statusClaude && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13 }}>
              <span style={{ fontSize: 16 }}>{statusClaude.ok ? '🟢' : '🔴'}</span>
              <span style={{ fontWeight: 600 }}>
                {statusClaude.ok ? 'Formato correto' : statusClaude.msg}
              </span>
            </div>

            {statusClaude.ok && (
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Prefixo</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--green)' }}>sk-ant-...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Comprimento</span>
                  <span>{key.trim().length} caracteres</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  ⚠️ A API da Anthropic bloqueia chamadas diretas do browser (CORS). Para ver
                  saldo de créditos, uso e expiração da chave acesse o{' '}
                  <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
                    Console → Billing
                  </a>
                  {' '}e para uso detalhado de tokens veja{' '}
                  <a href="https://console.anthropic.com/settings/usage" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
                    Console → Usage
                  </a>.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backup local */}
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
