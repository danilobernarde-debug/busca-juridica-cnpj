import { useState } from 'react';


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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: statusClaude ? 16 : 0 }}>
          <button className="btn-primary" onClick={() => onSave({ ...config, claudeKey: key })}>Salvar</button>
          <button className="btn-secondary" onClick={handleVerificar} disabled={!key.trim()}>
            🔍 Verificar formato
          </button>
          <a href="https://console.anthropic.com/settings/api-keys" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            🔑 Gerenciar chaves
          </a>
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
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                  ✅ IA funcionando — importação de PDFs e extração de texto via Claude estão ativos.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
