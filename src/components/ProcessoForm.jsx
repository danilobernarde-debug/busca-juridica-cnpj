import { useState } from 'react';
import { uid, now } from '../lib/utils.js';

const BLANK = {
  numero: '', tipo: 'juridico', fase: 'Conhecimento',
  parte: '', tribunal: '', tramitacao: '',
  uf: '', instancia: '', valorCausa: '', dataAjuizamento: '',
  tipoDocumento: '', assuntos: [],
  audiencias: [], arquivos: [], notas: [], movimentacoes: [],
  createdAt: now(), updatedAt: now(),
};

export default function ProcessoForm({ processo, onSave, onCancel }) {
  const [form, setForm] = useState(processo || BLANK);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.numero || !form.parte) { alert('Número e parte são obrigatórios.'); return; }
    onSave({
      ...form,
      id: form.id || uid(),
      valorCausa: form.valorCausa ? parseFloat(form.valorCausa) : null,
      assuntos: typeof form.assuntos === 'string'
        ? form.assuntos.split(',').map(s => s.trim()).filter(Boolean)
        : form.assuntos || [],
      updatedAt: now(),
    });
  };

  const assuntosStr = Array.isArray(form.assuntos) ? form.assuntos.join(', ') : form.assuntos || '';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
        {processo ? 'Editar processo' : 'Novo processo'}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 760 }}>

        {/* Identificação */}
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Identificação</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Número do processo *</label>
            <input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="0000000-00.0000.0.00.0000" autoFocus />
          </div>
          <div className="field">
            <label>Tipo *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="juridico">⚖️ Jurídico (Judicial)</option>
              <option value="administrativo">🏛️ Administrativo</option>
            </select>
          </div>
          <div className="field">
            <label>Fase *</label>
            <select value={form.fase} onChange={e => set('fase', e.target.value)}>
              <option>Conhecimento</option>
              <option>Execução</option>
              <option>Arquivado</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Parte contrária *</label>
            <input value={form.parte} onChange={e => set('parte', e.target.value)} placeholder="Nome da parte contrária" />
          </div>
          <div className="field">
            <label>Tribunal / Órgão</label>
            <input value={form.tribunal} onChange={e => set('tribunal', e.target.value)} placeholder="TJGO, TRT18, MPT..." />
          </div>
          <div className="field">
            <label>Vara / Tramitação</label>
            <input value={form.tramitacao} onChange={e => set('tramitacao', e.target.value)} placeholder="1ª Vara Cível - Goiânia/GO" />
          </div>
          <div className="field">
            <label>UF</label>
            <input value={form.uf || ''} onChange={e => set('uf', e.target.value.toUpperCase().slice(0, 2))} placeholder="GO" maxLength={2} />
          </div>
          <div className="field">
            <label>Instância</label>
            <input value={form.instancia || ''} onChange={e => set('instancia', e.target.value)} placeholder="Primeiro Grau" />
          </div>
        </div>

        {/* Detalhes */}
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Detalhes</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div className="field">
            <label>Valor da causa (R$)</label>
            <input type="number" value={form.valorCausa || ''} onChange={e => set('valorCausa', e.target.value)} placeholder="0.00" step="0.01" min="0" />
          </div>
          <div className="field">
            <label>Data do ajuizamento</label>
            <input type="date" value={form.dataAjuizamento || ''} onChange={e => set('dataAjuizamento', e.target.value)} />
          </div>
          <div className="field">
            <label>Tipo de documento</label>
            <input value={form.tipoDocumento || ''} onChange={e => set('tipoDocumento', e.target.value)} placeholder="Citação, Intimação..." />
          </div>
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Assuntos (separados por vírgula)</label>
            <input value={assuntosStr} onChange={e => set('assuntos', e.target.value)} placeholder="Rescisão Indireta, Horas Extras, Dano Moral..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" onClick={submit}>Salvar processo</button>
        </div>
      </div>
    </div>
  );
}
