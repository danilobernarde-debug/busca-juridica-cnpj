import { useState } from 'react';
import { fmtHora } from '../../lib/utils.js';

export default function TabAudiencias({ audiencias, onAdd, onDel }) {
  const [form, setForm] = useState({ data: '', hora: '', tipo: 'Conciliação', local: '', obs: '' });
  const [adicionando, setAdicionando] = useState(false);
  const TIPOS = ['Conciliação', 'Instrução', 'Julgamento', 'Perícia', 'Mediação', 'Depoimento', 'Outro'];
  const sorted = [...audiencias].sort((a, b) => a.data.localeCompare(b.data));
  const submit = () => {
    if (!form.data || !form.tipo) return;
    onAdd(form);
    setForm({ data: '', hora: '', tipo: 'Conciliação', local: '', obs: '' });
    setAdicionando(false);
  };
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <div>
      {adicionando && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📅 Nova audiência</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="field"><label>Data *</label><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
            <div className="field"><label>Hora</label><input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
            <div className="field"><label>Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Local</label><input value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} placeholder="Sala, link de videoconferência..." /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Observações</label><textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} placeholder="Documentos necessários, pauta..." style={{ minHeight: 60 }} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setAdicionando(false)}>Cancelar</button>
            <button className="btn-primary" onClick={submit} disabled={!form.data || !form.tipo}>Salvar</button>
          </div>
        </div>
      )}
      {!adicionando && <button className="btn-primary" onClick={() => setAdicionando(true)} style={{ marginBottom: 16 }}>+ Agendar audiência</button>}
      {sorted.map(a => {
        const passada = a.data < hoje;
        return (
          <div key={a.id} style={{ background: 'var(--surface)', border: `1px solid ${passada ? 'var(--border)' : 'rgba(59,130,246,.3)'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: passada ? .7 : 1 }}>
            <div style={{ textAlign: 'center', minWidth: 44 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: passada ? 'var(--muted)' : 'var(--blue)', lineHeight: 1 }}>{a.data.slice(8)}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(a.data.slice(5, 7)) - 1] + '/' + a.data.slice(0, 4)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.tipo} {a.hora && <span style={{ color: 'var(--blue)', fontWeight: 400 }}>· {fmtHora(a.hora)}</span>}</div>
              {a.local && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {a.local}</div>}
              {a.obs && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{a.obs}</div>}
              {passada && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Realizada</div>}
            </div>
            <button className="btn-ghost" onClick={() => onDel(a.id)} style={{ fontSize: 14 }}>✕</button>
          </div>
        );
      })}
      {audiencias.length === 0 && !adicionando && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Nenhuma audiência agendada.</div>}
    </div>
  );
}
