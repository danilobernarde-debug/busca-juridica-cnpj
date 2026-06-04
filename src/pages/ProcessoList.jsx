import { useState } from 'react';
import { fmtData } from '../lib/utils.js';
import { FASE_STYLE, TIPO_STYLE } from '../constants/styles.js';
import Badge from '../components/Badge.jsx';

export default function ProcessoList({ processos, tipo, setProcessoAberto, setView, onAdd, onImportDJE, onImportTexto }) {
  const [busca, setBusca] = useState('');
  const [filtroFase, setFiltroFase] = useState('Todos');
  const [filtroTribunal, setFiltroTribunal] = useState('Todos');
  const [filtroRamo, setFiltroRamo] = useState('Todos');
  const [filtroParte, setFiltroParte] = useState('');
  const [filtroAssunto, setFiltroAssunto] = useState('Todos');
  const [filtroTipoDoc, setFiltroTipoDoc] = useState('Todos');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 40;

  const resetPagina = () => setPagina(1);

  const isTRT = (trib) => (trib || '').toUpperCase().startsWith('TRT');

  const base = processos.filter(p => {
    if (p.tipo !== tipo) return false;
    if (tipo === 'juridico') {
      if (filtroRamo === 'Cível' && isTRT(p.tribunal)) return false;
      if (filtroRamo === 'Trabalhista' && !isTRT(p.tribunal)) return false;
    }
    return true;
  });

  const lista = base.filter(p => {
    if (filtroFase !== 'Todos' && p.fase !== filtroFase) return false;
    if (filtroTribunal !== 'Todos' && p.tribunal !== filtroTribunal) return false;
    if (filtroAssunto !== 'Todos' && !(p.assuntos || []).includes(filtroAssunto)) return false;
    if (filtroTipoDoc !== 'Todos' && p.tipoDocumento !== filtroTipoDoc) return false;
    if (filtroParte) {
      const q = filtroParte.toLowerCase();
      const nomeParte = p.parte?.toLowerCase() || '';
      const nomePartes = (p.partes || []).map(pt => pt.nome.toLowerCase()).join(' ');
      if (!nomeParte.includes(q) && !nomePartes.includes(q)) return false;
    }
    if (busca) {
      const q = busca.toLowerCase();
      return p.numero.toLowerCase().includes(q) || p.parte.toLowerCase().includes(q) || (p.tribunal || '').toLowerCase().includes(q);
    }
    return true;
  });

  const tribunais   = ['Todos', ...new Set(base.map(p => p.tribunal))];
  const assuntos    = ['Todos', ...new Set(base.flatMap(p => p.assuntos || []))];
  const tiposDocs   = ['Todos', ...new Set(base.map(p => p.tipoDocumento).filter(Boolean))];
  const totalPaginas = Math.ceil(lista.length / POR_PAGINA);
  const listaPagina = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const st = TIPO_STYLE[tipo];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{st.icon} {st.label}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{lista.length} processo(s)</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onImportDJE} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            📄 Importar Notificação
          </button>
          <button className="btn-secondary" onClick={onImportTexto} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            📋 Colar texto
          </button>
          <button className="btn-primary" onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            + Novo processo
          </button>
        </div>
      </div>

      {tipo === 'juridico' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {['Todos', 'Cível', 'Trabalhista'].map(r => (
            <button key={r} onClick={() => { setFiltroRamo(r); setFiltroTribunal('Todos'); resetPagina(); }}
              style={{ padding: '7px 18px', borderRadius: 8, border: filtroRamo === r ? '1px solid var(--blue)' : '1px solid var(--border)', background: filtroRamo === r ? 'rgba(59,130,246,.15)' : 'var(--surface)', color: filtroRamo === r ? '#93c5fd' : 'var(--muted)', fontSize: 13, fontWeight: filtroRamo === r ? 700 : 400, cursor: 'pointer' }}>
              {r === 'Cível' ? '🏛 Cível' : r === 'Trabalhista' ? '👷 Trabalhista' : '📋 Todos'}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={busca} onChange={e => { setBusca(e.target.value); resetPagina(); }} placeholder="Buscar por número ou parte..." style={{ width: 240 }} />
        <input value={filtroParte} onChange={e => { setFiltroParte(e.target.value); resetPagina(); }} placeholder="Filtrar por parte..." style={{ width: 200 }} />
        <select value={filtroFase} onChange={e => { setFiltroFase(e.target.value); resetPagina(); }} style={{ width: 150 }}>
          <option>Todos</option>
          <option>Conhecimento</option>
          <option>Execução</option>
          <option>Arquivado</option>
        </select>
        <select value={filtroTribunal} onChange={e => { setFiltroTribunal(e.target.value); resetPagina(); }} style={{ width: 130 }}>
          {tribunais.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filtroAssunto} onChange={e => { setFiltroAssunto(e.target.value); resetPagina(); }} style={{ width: 200 }}>
          {assuntos.map(a => <option key={a}>{a}</option>)}
        </select>
        {tiposDocs.length > 1 && (
          <select value={filtroTipoDoc} onChange={e => { setFiltroTipoDoc(e.target.value); resetPagina(); }} style={{ width: 140 }}>
            {tiposDocs.map(t => <option key={t}>{t}</option>)}
          </select>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {['Número', 'Fase', 'Parte contrária', 'Tribunal / Órgão', 'Tramitação', 'Valor', 'Audiências'].map(h =>
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {listaPagina.length === 0
              ? <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum processo encontrado.</td></tr>
              : listaPagina.map(p => {
                const fs = FASE_STYLE[p.fase] || {};
                const proxAud = (p.audiencias || []).filter(a => a.data >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.data.localeCompare(b.data))[0];
                return (
                  <tr key={p.id} onClick={() => { setProcessoAberto(p); setView('detalhe'); }}
                    style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, color: '#93c5fd', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero}</td>
                    <td style={{ padding: '11px 14px' }}><Badge label={fs.label || p.fase} color={fs.color} bg={fs.bg} /></td>
                    <td style={{ padding: '11px 14px', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.parte}</td>
                    <td style={{ padding: '11px 14px' }}><Badge label={p.tribunal} color="#94a3b8" bg="rgba(148,163,184,.1)" /></td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tramitacao}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {p.valorCausa
                        ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                            {Number(p.valorCausa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12 }}>
                      {proxAud
                        ? <span style={{ color: 'var(--green)' }}>📅 {fmtData(proxAud.data)}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>
                      }
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn-secondary" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            style={{ padding: '6px 14px' }}>← Anterior</button>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
              .reduce((acc, n, i, arr) => {
                if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) => n === '...'
                ? <span key={`e${i}`} style={{ padding: '6px 4px', color: 'var(--muted)', fontSize: 13 }}>…</span>
                : <button key={n} onClick={() => setPagina(n)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: pagina === n ? '1px solid var(--blue)' : '1px solid var(--border)', background: pagina === n ? 'rgba(59,130,246,.15)' : 'var(--surface)', color: pagina === n ? '#93c5fd' : 'var(--muted)', fontSize: 13, fontWeight: pagina === n ? 700 : 400, cursor: 'pointer' }}>
                    {n}
                  </button>
              )}
          </div>
          <button className="btn-secondary" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
            style={{ padding: '6px 14px' }}>Próxima →</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
            {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, lista.length)} de {lista.length}
          </span>
        </div>
      )}
    </div>
  );
}
