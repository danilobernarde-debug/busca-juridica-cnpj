import { useState } from 'react';
import { uid } from '../../lib/utils.js';

export default function TabPartes({ partes, onUpdate }) {
  const [adicionando, setAdicionando] = useState(false);
  const [form, setForm] = useState({ nome: '', documento: '', polo: 'ativo', tipo_pessoa: 'juridica' });
  const POLOS = [{ v: 'ativo', label: 'Polo Ativo', cor: 'var(--green)' }, { v: 'passivo', label: 'Polo Passivo', cor: 'var(--red)' }, { v: 'outro', label: 'Outro', cor: 'var(--muted)' }];

  const adicionar = () => {
    if (!form.nome.trim()) return;
    onUpdate([...partes, { id: uid(), ...form }]);
    setForm({ nome: '', documento: '', polo: 'ativo', tipo_pessoa: 'juridica' });
    setAdicionando(false);
  };

  const remover = (id) => onUpdate(partes.filter(p => p.id !== id));

  const grupos = { ativo: partes.filter(p => p.polo === 'ativo'), passivo: partes.filter(p => p.polo === 'passivo'), outro: partes.filter(p => p.polo === 'outro') };

  return (
    <div>
      {POLOS.map(polo => grupos[polo.v].length > 0 && (
        <div key={polo.v} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: polo.cor, marginBottom: 8 }}>{polo.label}</div>
          {grupos[polo.v].map(pt => (
            <div key={pt.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{pt.nome}</div>
                {pt.documento && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{pt.documento}</div>}
              </div>
              <button className="btn-ghost" onClick={() => remover(pt.id)} style={{ fontSize: 14 }}>✕</button>
            </div>
          ))}
        </div>
      ))}

      {adicionando ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="field" style={{ gridColumn: '1/-1' }}><label>Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" autoFocus /></div>
            <div className="field"><label>CPF / CNPJ</label><input value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} placeholder="000.000.000-00" /></div>
            <div className="field"><label>Tipo</label>
              <select value={form.tipo_pessoa} onChange={e => setForm({ ...form, tipo_pessoa: e.target.value })}>
                <option value="juridica">Pessoa Jurídica</option>
                <option value="fisica">Pessoa Física</option>
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1/-1' }}><label>Polo</label>
              <select value={form.polo} onChange={e => setForm({ ...form, polo: e.target.value })}>
                {POLOS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setAdicionando(false)}>Cancelar</button>
            <button className="btn-primary" onClick={adicionar} disabled={!form.nome.trim()}>Adicionar</button>
          </div>
        </div>
      ) : (
        <button className="btn-primary" onClick={() => setAdicionando(true)} style={{ marginTop: 8 }}>+ Adicionar parte</button>
      )}

      {partes.length === 0 && !adicionando && (
        <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Nenhuma parte cadastrada.</div>
      )}
    </div>
  );
}
