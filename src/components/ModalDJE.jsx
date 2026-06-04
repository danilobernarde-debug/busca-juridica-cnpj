import { useState, useRef } from 'react';
import { uid } from '../lib/utils.js';
import { processarUmArquivo } from '../lib/pdf.js';

export default function ModalDJE({ onSalvar, onFechar, onConcluido, claudeKey, processos }) {
  const [estado, setEstado] = useState('idle'); // idle | processando | revisao | concluido
  const [fila, setFila] = useState([]);       // { file, status, resultado, erro }
  const [atual, setAtual] = useState(0);
  // revisão de arquivo único
  const [form, setForm] = useState(null);
  const inputRef = useRef();

  const extraidosRef  = useRef([]);
  const indiceRef     = useRef(0);
  const decisoesRef   = useRef([]);
  const [ultimoSalvo, setUltimoSalvo] = useState(null);

  const formParaProcesso = (f) => {
    const r = f._resultado;
    const aud = f.audData ? [{ id: uid(), data: f.audData, hora: f.audHora, tipo: f.audTipo, local: f.audLocal, obs: '' }] : [];
    return {
      ...r.processo,
      numero: f.numero, tipo: f.tipo, fase: f.fase, parte: f.parte,
      tribunal: f.tribunal, tramitacao: f.tramitacao,
      uf: f.uf || null, instancia: f.instancia || null,
      valorCausa: f.valorCausa || r.processo.valorCausa || null,
      dataAjuizamento: f.dataAjuizamento || r.processo.dataAjuizamento || null,
      tipoDocumento: f.tipoDocumento || r.processo.tipoDocumento || null,
      partes: f.partes || r.processo.partes || [],
      assuntos: f.assuntos || r.processo.assuntos || [],
      audiencias: r.tipo === 'atualizar'
        ? [...(r.processo.audiencias || []).filter(a => !aud.find(b => b.data === a.data)), ...aud]
        : aud,
    };
  };

  const iniciarProcessamento = async (files) => {
    const lista = Array.from(files).filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.txt') || f.type.startsWith('image/')
    );
    if (!lista.length) return;

    setEstado('processando');
    setFila(lista.map(f => ({ nome: f.name, status: 'aguardando' })));

    const extraidos = [];
    for (let i = 0; i < lista.length; i++) {
      setAtual(i);
      setFila(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processando' } : item));
      try {
        const resultado = await processarUmArquivo(lista[i], processos, claudeKey);
        extraidos.push({ nome: lista[i].name, resultado });
        setFila(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'lido' } : item));
      } catch (e) {
        setFila(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'erro', erro: e.message } : item));
      }
    }

    if (!extraidos.length) { setEstado('concluido'); return; }

    extraidosRef.current = extraidos;
    decisoesRef.current  = new Array(extraidos.length).fill(null);
    indiceRef.current    = 0;
    abrirItem(0);
  };

  const abrirItem = (idx) => {
    const item = extraidosRef.current[idx];
    const decisaoSalva = decisoesRef.current[idx];
    // Restaura form anterior se o usuário já tinha editado este item
    if (decisaoSalva?.form) {
      setForm(decisaoSalva.form);
    } else {
      const p = item.resultado.processo;
      const aud = p.audiencias?.[0];
      setForm({
        numero: p.numero, tipo: p.tipo, fase: p.fase, parte: p.parte,
        tribunal: p.tribunal, tramitacao: p.tramitacao,
        uf: p.uf || '', instancia: p.instancia || '',
        valorCausa: p.valorCausa || '',
        dataAjuizamento: p.dataAjuizamento || '',
        partes: p.partes || [], assuntos: p.assuntos || [],
        audData: aud?.data || '', audHora: aud?.hora || '',
        audTipo: aud?.tipo || 'Audiência', audLocal: aud?.local || '',
        _resultado: item.resultado,
      });
    }
    setEstado('revisao');
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const avancarDecisao = (acao) => {
    const idx = indiceRef.current;
    decisoesRef.current[idx] = { acao, form };
    const proximo = idx + 1;
    if (proximo < extraidosRef.current.length) {
      indiceRef.current = proximo;
      abrirItem(proximo);
    } else {
      setEstado('resumo'); // todos revisados → mostra lista de confirmação
    }
  };

  const confirmarAtual = () => avancarDecisao('salvar');
  const pularAtual     = () => avancarDecisao('pular');

  const voltarAnterior = () => {
    const origem = estado === 'resumo' ? extraidosRef.current.length - 1 : indiceRef.current - 1;
    decisoesRef.current[indiceRef.current] = { acao: decisoesRef.current[indiceRef.current]?.acao || 'pendente', form };
    indiceRef.current = origem;
    abrirItem(origem);
  };

  const finalizarTudo = async () => {
    const decisoes = decisoesRef.current;
    let ultimoSalvoLocal = null;
    for (const d of decisoes) {
      if (d?.acao === 'salvar') {
        await onSalvar({ tipo: d.form._resultado.tipo, processo: formParaProcesso(d.form) });
        ultimoSalvoLocal = formParaProcesso(d.form);
      }
    }
    setFila(prev => prev.map((item, i) => {
      const d = decisoes[i];
      if (!d) return item;
      return { ...item, status: d.acao === 'salvar' ? 'ok' : 'pulado', resultado: d.form?._resultado };
    }));
    setUltimoSalvo(ultimoSalvoLocal);
    setEstado('concluido');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 620, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>📄 Importar Notificação</div>
          <button className="btn-ghost" onClick={onFechar} style={{ fontSize: 18 }}>✕</button>
        </div>

        {estado === 'idle' && (
          <div>
            <div
              onClick={() => inputRef.current.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--blue)'; }}
              onDragLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; iniciarProcessamento(e.dataTransfer.files); }}
              style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .2s' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Arraste a notificação aqui</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>PDF, TXT ou imagem — pode selecionar vários de uma vez</div>
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,.gif" multiple style={{ display: 'none' }}
              onChange={e => iniciarProcessamento(e.target.files)} />
          </div>
        )}

        {estado === 'processando' && (
          <div>
            <div style={{ marginBottom: 16, color: 'var(--muted)', fontSize: 13 }}>
              Processando {atual + 1} de {fila.length} arquivo(s)...
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, height: 6, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--blue)', borderRadius: 8, width: `${((atual) / fila.length) * 100}%`, transition: 'width .3s' }} />
            </div>
            {fila.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>
                  {item.status === 'ok' ? '✅' : item.status === 'erro' ? '❌' : item.status === 'processando' ? '⏳' : '⬜'}
                </span>
                <span style={{ flex: 1, color: item.status === 'erro' ? 'var(--red)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</span>
                {item.status === 'ok' && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.resultado?.tipo === 'atualizar' ? 'adicionado' : 'novo'}</span>}
              </div>
            ))}
          </div>
        )}

        {estado === 'revisao' && form && (() => {
          const total    = extraidosRef.current.length;
          const idx      = indiceRef.current;
          const isMulti  = total > 1;

          return (
            <div>
              {/* Banner: processo existente ou novo */}
              <div style={{ background: form._resultado?.tipo === 'atualizar' ? 'rgba(245,158,11,.08)' : 'rgba(16,185,129,.08)', border: `1px solid ${form._resultado?.tipo === 'atualizar' ? 'rgba(245,158,11,.3)' : 'rgba(16,185,129,.3)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: form._resultado?.tipo === 'atualizar' ? '#fcd34d' : '#6ee7b7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{form._resultado?.tipo === 'atualizar' ? '⚠️ Processo já existe — a notificação será adicionada a ele.' : '✅ Novo processo. Revise e confirme.'}</span>
                {isMulti && <span style={{ color: 'var(--muted)', fontSize: 12 }}>{idx + 1} / {total}</span>}
              </div>

              {/* Formulário */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Número</label><input value={form.numero} onChange={e => set('numero', e.target.value)} /></div>
                <div className="field"><label>Tipo</label>
                  <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    <option value="juridico">⚖️ Jurídico</option>
                    <option value="administrativo">🏛️ Administrativo</option>
                  </select>
                </div>
                <div className="field"><label>Fase</label>
                  <select value={form.fase} onChange={e => set('fase', e.target.value)}>
                    <option>Conhecimento</option><option>Execução</option><option>Arquivado</option>
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Parte contrária</label><input value={form.parte} onChange={e => set('parte', e.target.value)} /></div>
                <div className="field"><label>Tribunal</label><input value={form.tribunal} onChange={e => set('tribunal', e.target.value)} /></div>
                <div className="field"><label>Vara / Tramitação</label><input value={form.tramitacao} onChange={e => set('tramitacao', e.target.value)} /></div>
                <div className="field"><label>UF</label><input value={form.uf || ''} onChange={e => set('uf', e.target.value.toUpperCase().slice(0,2))} placeholder="GO" maxLength={2} /></div>
                <div className="field"><label>Instância</label><input value={form.instancia || ''} onChange={e => set('instancia', e.target.value)} placeholder="Primeiro Grau" /></div>
                <div className="field"><label>Valor da causa (R$)</label><input type="number" value={form.valorCausa || ''} onChange={e => set('valorCausa', e.target.value ? parseFloat(e.target.value) : '')} placeholder="0.00" step="0.01" /></div>
                <div className="field"><label>Data do ajuizamento</label><input type="date" value={form.dataAjuizamento || ''} onChange={e => set('dataAjuizamento', e.target.value)} /></div>
                <div className="field"><label>Tipo de documento</label><input value={form.tipoDocumento || ''} onChange={e => set('tipoDocumento', e.target.value)} placeholder="Citação, Intimação..." /></div>
              </div>

              {form.audData && (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📅 Audiência identificada</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div className="field"><label>Data</label><input type="date" value={form.audData} onChange={e => set('audData', e.target.value)} /></div>
                    <div className="field"><label>Hora</label><input type="time" value={form.audHora} onChange={e => set('audHora', e.target.value)} /></div>
                    <div className="field"><label>Tipo</label><input value={form.audTipo} onChange={e => set('audTipo', e.target.value)} /></div>
                  </div>
                  <div className="field" style={{ marginTop: 8 }}><label>Local / Link</label><input value={form.audLocal} onChange={e => set('audLocal', e.target.value)} /></div>
                </div>
              )}

              {/* Partes extraídas */}
              {form.partes?.length > 0 && (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>👥 Partes identificadas</div>
                  {form.partes.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${pt.polo === 'ativo' ? 'rgba(59,130,246,.4)' : 'rgba(239,68,68,.4)'}`, color: pt.polo === 'ativo' ? 'var(--blue)' : 'var(--red)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {pt.polo === 'ativo' ? 'Polo Ativo' : 'Polo Passivo'}
                      </span>
                      <span style={{ flex: 1 }}>{pt.nome}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pt.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Assuntos e valor */}
              {(form.assuntos?.length > 0 || form.valorCausa) && (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  {form.valorCausa && (
                    <div style={{ fontSize: 13, marginBottom: form.assuntos?.length ? 10 : 0 }}>
                      <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>VALOR DA CAUSA </span>
                      R$ {Number(form.valorCausa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  {form.assuntos?.length > 0 && (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📋 Assuntos identificados</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {form.assuntos.map(a => (
                          <span key={a} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'rgba(167,139,250,.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,.3)', fontWeight: 600 }}>{a}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {idx > 0 && <button className="btn-secondary" onClick={voltarAnterior}>← Voltar</button>}
                <button className="btn-secondary" onClick={pularAtual}>Pular →</button>
                <button className="btn-primary" onClick={confirmarAtual} disabled={!form.numero || !form.parte}>✅ Confirmar</button>
              </div>
            </div>
          );
        })()}

        {estado === 'resumo' && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Confirmar importação</div>
            {extraidosRef.current.map((item, i) => {
              const d = decisoesRef.current[i];
              const acao = d?.acao || 'pendente';
              const numero = d?.form?.numero || item.nome;
              const parte  = d?.form?.parte || '—';
              const existente = d?.form?._resultado?.tipo === 'atualizar';
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 18 }}>{acao === 'salvar' ? '✅' : acao === 'pular' ? '⏭️' : '⬜'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{numero}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parte}</div>
                  </div>
                  <span style={{ fontSize: 11, color: acao === 'salvar' ? 'var(--green)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {acao === 'salvar' ? (existente ? 'adicionar ao existente' : 'novo processo') : 'pular'}
                  </span>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-secondary" onClick={voltarAnterior}>← Voltar</button>
              <button className="btn-primary" onClick={finalizarTudo}>
                ✅ Confirmar e salvar {decisoesRef.current.filter(d => d?.acao === 'salvar').length} processo(s)
              </button>
            </div>
          </div>
        )}

        {estado === 'concluido' && (
          <div>
            <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {fila.filter(f => f.status === 'ok').length} salvo(s) · {fila.filter(f => f.status === 'pulado').length} pulado(s) · {fila.filter(f => f.status === 'erro').length} erro(s)
              </div>
            </div>
            {fila.map((item, i) => {
              const icon  = item.status === 'ok' ? '✅' : item.status === 'pulado' ? '⏭️' : '❌';
              const color = item.status === 'ok' ? 'var(--green)' : item.status === 'pulado' ? 'var(--muted)' : 'var(--red)';
              const label = item.status === 'ok'
                ? (item.resultado?.tipo === 'atualizar' ? 'adicionado ao processo existente' : 'novo processo criado')
                : item.status === 'pulado' ? 'pulado' : item.erro || 'erro ao ler arquivo';
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</span>
                  <span style={{ fontSize: 11, color }}>{label}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => { setEstado('idle'); setFila([]); setAtual(0); setUltimoSalvo(null); }}>Importar mais</button>
              <button className="btn-primary" onClick={() => onConcluido ? onConcluido(ultimoSalvo) : onFechar()}>Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
