import { useState } from 'react';
import { uid, now } from '../lib/utils.js';
import { parsearTextoEstruturado, extrairProcessoComIA } from '../lib/parsearTexto.js';

const FASES = ['Conhecimento', 'Execução', 'Arquivado'];
const TIPOS_AUD = ['Audiência Inicial', 'Conciliação', 'Instrução', 'Julgamento', 'Perícia', 'Outro'];

export default function ModalTexto({ onSalvar, onFechar, processos, claudeKey }) {
  const [estado, setEstado] = useState('idle'); // idle | processando | revisao | salvo
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(null);

  const processar = async () => {
    if (!texto.trim()) return;
    setErro('');
    setEstado('processando');
    try {
      let parsed = parsearTextoEstruturado(texto);

      if (!parsed.numero) {
        if (!claudeKey) {
          setErro('Formato não reconhecido e nenhuma chave de IA configurada. Configure a chave Claude nas Configurações.');
          setEstado('idle');
          return;
        }
        parsed = await extrairProcessoComIA(texto, claudeKey);
      }

      if (!parsed.numero) {
        setErro('Não foi possível extrair o número do processo. Tente um texto mais completo.');
        setEstado('idle');
        return;
      }

      setForm({ ...parsed });
      setEstado('revisao');
    } catch (e) {
      setErro('Erro ao processar: ' + e.message);
      setEstado('idle');
    }
  };

  const salvar = async () => {
    const proc = {
      id: uid(),
      ...form,
      createdAt: now(),
      updatedAt: now(),
      audiencias: (form.audiencias || []).map(a => ({ id: uid(), ...a })),
      movimentacoes: (form.movimentacoes || []).map(m => ({ id: uid(), ...m })),
      partes: (form.partes || []).map(p => ({ id: uid(), ...p })),
    };
    const sucesso = await onSalvar(proc);
    if (sucesso !== false) setEstado('salvo');
  };

  const adicionarOutro = () => {
    setTexto('');
    setForm(null);
    setErro('');
    setEstado('idle');
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAud = (k, v) => setForm(f => ({
    ...f,
    audiencias: f.audiencias?.length
      ? [{ ...f.audiencias[0], [k]: v }]
      : [{ data: '', hora: '', tipo: 'Audiência', local: '', obs: '', [k]: v }],
  }));
  const aud = form?.audiencias?.[0];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: estado === 'revisao' ? 720 : 560, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>📋 Adicionar processo por texto</div>
          <button className="btn-ghost" onClick={onFechar} style={{ fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: 24, flex: 1 }}>

          {/* ── ESTADO SALVO ── */}
          {estado === 'salvo' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Processo salvo com sucesso!</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>{form?.numero}</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={adicionarOutro} style={{ padding: '10px 24px' }}>
                  + Adicionar outro
                </button>
                <button className="btn-primary" onClick={onFechar} style={{ padding: '10px 24px' }}>
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* ── ESTADO PROCESSANDO ── */}
          {estado === 'processando' && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Analisando texto com IA...</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Aguarde um momento</div>
            </div>
          )}

          {/* ── ESTADO IDLE ── */}
          {estado === 'idle' && (
            <div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                Cole o texto da notificação abaixo. O sistema extrai automaticamente número, tribunal, partes, audiência e assuntos.
              </p>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Cole aqui o texto da notificação..."
                style={{ width: '100%', minHeight: 260, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                autoFocus
              />
              {erro && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{erro}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
                <button className="btn-primary" onClick={processar} disabled={!texto.trim()}>Processar →</button>
              </div>
            </div>
          )}

          {/* ── ESTADO REVISÃO ── */}
          {estado === 'revisao' && form && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Revise os dados extraídos antes de salvar.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Número do processo</label>
                  <input value={form.numero} onChange={e => set('numero', e.target.value)} />
                </div>
                <div className="field">
                  <label>Tribunal</label>
                  <input value={form.tribunal} onChange={e => set('tribunal', e.target.value)} />
                </div>
                <div className="field">
                  <label>Fase</label>
                  <select value={form.fase} onChange={e => set('fase', e.target.value)}>
                    {FASES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Vara / Órgão julgador</label>
                  <input value={form.tramitacao} onChange={e => set('tramitacao', e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Parte contrária (polo ativo)</label>
                  <input value={form.parte} onChange={e => set('parte', e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Assuntos (separados por vírgula)</label>
                  <input value={(form.assuntos || []).join(', ')} onChange={e => set('assuntos', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                </div>
                <div className="field">
                  <label>UF</label>
                  <input value={form.uf || ''} onChange={e => set('uf', e.target.value.toUpperCase().slice(0,2))} placeholder="GO" maxLength={2} />
                </div>
                <div className="field">
                  <label>Instância</label>
                  <input value={form.instancia || ''} onChange={e => set('instancia', e.target.value)} placeholder="Primeiro Grau" />
                </div>
                <div className="field">
                  <label>Valor da causa (R$)</label>
                  <input type="number" value={form.valorCausa || ''} onChange={e => set('valorCausa', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" step="0.01" />
                </div>
                <div className="field">
                  <label>Data do ajuizamento</label>
                  <input type="date" value={form.dataAjuizamento || ''} onChange={e => set('dataAjuizamento', e.target.value)} />
                </div>
                <div className="field">
                  <label>Tipo de documento</label>
                  <input value={form.tipoDocumento || ''} onChange={e => set('tipoDocumento', e.target.value)} placeholder="Citação, Intimação..." />
                </div>
              </div>

              {/* Partes extraídas */}
              {form.partes?.length > 0 && (
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase' }}>Partes extraídas</div>
                  {form.partes.map((p, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 4, display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: p.polo === 'ativo' ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)', color: p.polo === 'ativo' ? 'var(--green)' : 'var(--red)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {p.polo === 'ativo' ? 'Ativo' : 'Passivo'}
                      </span>
                      <span>{p.nome}</span>
                      {p.documento && <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>{p.documento}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Audiência */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase' }}>Audiência</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="field">
                    <label>Data</label>
                    <input type="date" value={aud?.data || ''} onChange={e => setAud('data', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Hora</label>
                    <input type="time" value={aud?.hora || ''} onChange={e => setAud('hora', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Tipo</label>
                    <select value={aud?.tipo || 'Audiência'} onChange={e => setAud('tipo', e.target.value)}>
                      {TIPOS_AUD.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ gridColumn: '1/-1' }}>
                    <label>Local / Link</label>
                    <input value={aud?.local || ''} onChange={e => setAud('local', e.target.value)} placeholder="Presencial ou link de videoconferência" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                <button className="btn-secondary" onClick={() => setEstado('idle')}>← Voltar</button>
                <button className="btn-primary" onClick={salvar}>Salvar processo</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
