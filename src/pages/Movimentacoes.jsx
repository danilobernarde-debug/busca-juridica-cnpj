import { useState } from 'react';
import { fmtDataExtenso, normalizar } from '../lib/utils.js';
import { TIPO_STYLE } from '../constants/styles.js';
import Badge from '../components/Badge.jsx';

const POR_PAGINA = 40;

export default function Movimentacoes({ processos, setProcessoAberto, setView }) {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroOrigem, setFiltroOrigem] = useState('Todas');
  const [pagina, setPagina] = useState(1);

  const todas = processos.flatMap(p =>
    (p.movimentacoes || []).map(m => ({ ...m, processo: p }))
  );

  const filtradas = todas.filter(m => {
    if (filtroTipo === 'Jurídico' && m.processo.tipo !== 'juridico') return false;
    if (filtroTipo === 'Administrativo' && m.processo.tipo !== 'administrativo') return false;
    if (filtroOrigem === 'Automáticas' && m.origem !== 'DataJud (CNJ)') return false;
    if (filtroOrigem === 'Manuais' && m.origem === 'DataJud (CNJ)') return false;
    if (busca) {
      const q = normalizar(busca);
      return normalizar(m.evento).includes(q)
        || normalizar(m.processo.numero).includes(q)
        || normalizar(m.processo.parte).includes(q)
        || normalizar(m.processo.tribunal).includes(q);
    }
    return true;
  }).sort((a, b) => `${b.data || ''}${b.hora || ''}`.localeCompare(`${a.data || ''}${a.hora || ''}`));

  const totalPaginas = Math.ceil(filtradas.length / POR_PAGINA);
  const listaPagina = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const resetPagina = () => setPagina(1);

  const porDia = {};
  listaPagina.forEach(m => { (porDia[m.data || 'sem-data'] ||= []).push(m); });

  const abrir = (p) => { setProcessoAberto(p); setView('detalhe'); };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>🕘 Movimentações</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{filtradas.length} movimentação(ões)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={busca} onChange={e => { setBusca(e.target.value); resetPagina(); }}
          placeholder="Buscar por evento, número ou parte..." style={{ width: 260 }} />
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); resetPagina(); }} style={{ width: 160 }}>
          <option>Todos</option>
          <option>Jurídico</option>
          <option>Administrativo</option>
        </select>
        <select value={filtroOrigem} onChange={e => { setFiltroOrigem(e.target.value); resetPagina(); }} style={{ width: 160 }}>
          <option>Todas</option>
          <option>Automáticas</option>
          <option>Manuais</option>
        </select>
      </div>

      {listaPagina.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🕘</div>
          <div>Nenhuma movimentação encontrada.</div>
        </div>
      ) : (
        Object.entries(porDia).map(([data, movs]) => (
          <div key={data} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', textTransform: 'capitalize' }}>
                {data === 'sem-data' ? 'Sem data' : fmtDataExtenso(data)}
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            {movs.map(m => {
              const ts = TIPO_STYLE[m.processo.tipo] || {};
              return (
                <div key={m.id} onClick={() => abrir(m.processo)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 6, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ fontWeight: 700, color: 'var(--blue)', minWidth: 44, fontSize: 13, textAlign: 'center' }}>{m.hora || '—'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.evento}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.processo.numero} · {m.processo.parte}
                    </div>
                    {m.origem && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{m.origem}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <Badge label={ts.label} color={ts.color} bg={ts.bg} />
                    <Badge label={m.processo.tribunal} color="#94a3b8" bg="rgba(148,163,184,.1)" />
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

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
            {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtradas.length)} de {filtradas.length}
          </span>
        </div>
      )}
    </div>
  );
}
