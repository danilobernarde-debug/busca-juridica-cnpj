import { useState } from 'react';
import { uid } from '../../lib/utils.js';
import { sbClient } from '../../lib/supabase.js';
import { useVerificarDataJud, ResultadoVerificacao } from './useVerificarDataJud.jsx';

export default function TabMovimentacoes({ movimentacoes, onAdd, onDel, processo, onRecarregar }) {
  const [form, setForm] = useState({ data: '', hora: '', evento: '', origem: '' });
  const [adicionando, setAdicionando] = useState(false);
  const { verificando, resultado, verificarAgora } = useVerificarDataJud(processo, onRecarregar);

  const submit = () => {
    if (!form.evento.trim()) return;
    onAdd({ ...form });
    setForm({ data: '', hora: '', evento: '', origem: '' });
    setAdicionando(false);
  };

  const sorted = [...(movimentacoes || [])].sort((a, b) => {
    const da = a.data || '', db = b.data || '';
    return db.localeCompare(da);
  });

  return (
    <div>
      {adicionando ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Nova movimentação</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="field"><label>Data</label><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
            <div className="field"><label>Hora</label><input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: '1/-1' }}><label>Evento / Descrição *</label><input value={form.evento} onChange={e => setForm({ ...form, evento: e.target.value })} placeholder="Ex: Despacho publicado, Penhora realizada..." autoFocus /></div>
            <div className="field" style={{ gridColumn: '1/-1' }}><label>Origem</label><input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} placeholder="Sistema, DataJud, Manual..." /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setAdicionando(false)}>Cancelar</button>
            <button className="btn-primary" onClick={submit} disabled={!form.evento.trim()}>Salvar</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn-primary" onClick={() => setAdicionando(true)}>+ Registrar movimentação</button>
          {sbClient && processo && (
            <button className="btn-secondary" onClick={verificarAgora} disabled={verificando}>
              {verificando ? '⏳ Verificando...' : '🔄 Verificar agora'}
            </button>
          )}
        </div>
      )}

      <ResultadoVerificacao resultado={resultado} />

      {sorted.length === 0 && !adicionando && (
        <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Nenhuma movimentação registrada.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(m => (
          <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center', minWidth: 44, flexShrink: 0 }}>
              {m.data ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)', lineHeight: 1 }}>{m.data.slice(8)}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(m.data.slice(5,7))-1]}/{m.data.slice(0,4)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 18, color: 'var(--muted)' }}>—</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {m.evento}
                {m.hora && <span style={{ color: 'var(--blue)', fontWeight: 400, marginLeft: 8 }}>· {m.hora}</span>}
              </div>
              {m.origem && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontFamily: 'monospace' }}>{m.origem}</div>}
            </div>
            <button className="btn-ghost" onClick={() => onDel(m.id)} style={{ fontSize: 14, flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
