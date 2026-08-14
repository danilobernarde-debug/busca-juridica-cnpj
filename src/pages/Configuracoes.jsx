import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizar, fmtDataHora } from '../lib/utils.js';

export default function Configuracoes({ onMigrar, supabaseOk, erroSB, processos = [], onDelete }) {
  const navigate = useNavigate();

  // ─── PROCESSOS DUPLICADOS (mesma limpeza de caracteres usada ao importar) ────
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const p of processos) {
      if (!p.numero) continue;
      const chave = normalizar(p.numero);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(p);
    }
    return [...mapa.values()].filter(g => g.length > 1);
  }, [processos]);

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
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🤖 Claude (Anthropic)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span style={{ flex: 1 }}>A chave da IA fica guardada só no servidor (nunca no navegador) — configurada nas variáveis de ambiente do projeto na Vercel.</span>
        </div>
      </div>

      {/* Processos duplicados */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 600 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🔁 Processos duplicados</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Verificação com o número limpo (sem pontuação/acentos) — mesma regra usada ao importar.
        </div>

        {grupos.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--green)' }}>✅ Nenhum processo duplicado encontrado.</div>
        ) : (
          grupos.map((g, i) => (
            <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: i < grupos.length - 1 ? 10 : 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#fcd34d', marginBottom: 8 }}>
                ⚠️ {g.length} registros com o número {g[0].numero}
              </div>
              {g.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.parte || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {p.tribunal} · {(p.notas || []).length} nota(s) · {(p.arquivos || []).length} arquivo(s) · criado em {fmtDataHora(p.createdAt)}
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={() => navigate(`/processo/${p.id}`)} style={{ fontSize: 12, padding: '5px 10px' }}>Abrir</button>
                  <button className="btn-danger" onClick={() => { if (confirm(`Excluir este registro de ${p.parte || p.numero}?`)) onDelete?.(p.id); }} style={{ fontSize: 12, padding: '5px 10px' }}>🗑️ Excluir</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
