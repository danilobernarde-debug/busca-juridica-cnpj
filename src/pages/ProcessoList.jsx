import { useState, useCallback, useEffect } from 'react';
import { fmtData, useMobile } from '../lib/utils.js';
import { FASE_STYLE, TIPO_STYLE } from '../constants/styles.js';
import Badge from '../components/Badge.jsx';
import FiltrosAvancados, { filtrarArray, CAMPOS_PADRAO } from '../components/FiltrosAvancados/index.jsx';

const COLUNAS = [
  { id: 'fase',          label: 'Fase',             fixo: true },
  { id: 'parte',         label: 'Parte contrária',  fixo: true },
  { id: 'tribunal',      label: 'Tribunal / Órgão', fixo: true },
  { id: 'tramitacao',    label: 'Tramitação' },
  { id: 'ajuizamento',   label: 'Ajuizamento' },
  { id: 'valor',         label: 'Valor' },
  { id: 'audiencias',    label: 'Audiências' },
  { id: 'uf',            label: 'UF' },
  { id: 'instancia',     label: 'Instância' },
  { id: 'tipoDocumento', label: 'Tipo de doc.' },
];
const COLUNAS_PADRAO = new Set(['fase', 'parte', 'tribunal', 'tramitacao', 'valor', 'audiencias']);

// Remove acentos e qualquer caractere que não seja letra/número, para comparar números de processo
// e nomes independente de pontuação (-, ., /) e de como o usuário digitou.
const normalizar = (s) => (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]/g, '');

export default function ProcessoList({ processos, tipo, setProcessoAberto, setView, onAdd, onImportDJE, onImportTexto, visitados = new Set(), onMarcarTudoVisto }) {
  const mobile = useMobile();

  // ─── FILTROS SIMPLES (locais) ────────────────────────────────────────────────
  const [busca, setBusca] = useState('');
  const [filtroFase, setFiltroFase] = useState('Todos');
  const [filtroRamo, setFiltroRamo] = useState('Todos');
  const [filtroParte, setFiltroParte] = useState('');
  const [filtroVisto, setFiltroVisto] = useState('Todos');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 40;

  // ─── COLUNAS ─────────────────────────────────────────────────────────────────
  const [colunasVisiveis, setColunasVisiveis] = useState(COLUNAS_PADRAO);
  const [showColunas, setShowColunas] = useState(false);
  const toggleColuna = (id) => setColunasVisiveis(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const col = (id) => colunasVisiveis.has(id);
  useEffect(() => {
    if (!showColunas) return;
    const fechar = () => setShowColunas(false);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, [showColunas]);

  // ─── FILTROS AVANÇADOS (Supabase) ────────────────────────────────────────────
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);
  const [resultadoAvancado, setResultadoAvancado] = useState(null);

  const resetPagina = () => setPagina(1);

  const isTRT = (trib) => (trib || '').toUpperCase().startsWith('TRT');

  // ─── FILTRO BASE POR TIPO ────────────────────────────────────────────────────
  const base = processos.filter(p => {
    if (p.tipo !== tipo) return false;
    if (tipo === 'juridico') {
      if (filtroRamo === 'Cível' && isTRT(p.tribunal)) return false;
      if (filtroRamo === 'Trabalhista' && !isTRT(p.tribunal)) return false;
    }
    return true;
  });

  // ─── LISTA FINAL ─────────────────────────────────────────────────────────────
  // Quando filtros avançados ativos, usa resultadoAvancado; senão, filtra localmente.
  const lista = resultadoAvancado !== null
    ? resultadoAvancado
    : base.filter(p => {
        if (filtroFase !== 'Todos' && p.fase !== filtroFase) return false;
        if (filtroVisto === 'Não vistos' && visitados.has(p.id)) return false;
        if (filtroVisto === 'Vistos' && !visitados.has(p.id)) return false;
        if (filtroParte) {
          const q = filtroParte.toLowerCase();
          const nomeParte = p.parte?.toLowerCase() || '';
          const nomePartes = (p.partes || []).map(pt => pt.nome.toLowerCase()).join(' ');
          if (!nomeParte.includes(q) && !nomePartes.includes(q)) return false;
        }
        if (busca) {
          const q = normalizar(busca);
          return normalizar(p.numero).includes(q) || normalizar(p.parte).includes(q) || normalizar(p.tribunal).includes(q);
        }
        return true;
      });

  // ─── SUGESTÕES DA BUSCA (typeahead) ──────────────────────────────────────────
  const [showSugestoes, setShowSugestoes] = useState(false);
  const sugestoes = busca.trim()
    ? (() => {
        const q = normalizar(busca);
        return base.filter(p =>
          normalizar(p.numero).includes(q) || normalizar(p.parte).includes(q) || normalizar(p.tribunal).includes(q)
        ).slice(0, 8);
      })()
    : [];
  useEffect(() => {
    if (!showSugestoes) return;
    const fechar = () => setShowSugestoes(false);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, [showSugestoes]);

  const totalPaginas = Math.ceil(lista.length / POR_PAGINA);
  const listaPagina  = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const st = TIPO_STYLE[tipo];

  // ─── HANDLER PESQUISA AVANÇADA ───────────────────────────────────────────────
  const handlePesquisarAvancado = useCallback((filtros) => {
    setResultadoAvancado(filtrarArray(base, filtros, CAMPOS_PADRAO));
    resetPagina();
  }, [base]);

  const handleLimparAvancado = useCallback(() => {
    setResultadoAvancado(null);
    resetPagina();
  }, []);

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{st.icon} {st.label}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{lista.length} processo(s)</span>
            {resultadoAvancado !== null && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(139,92,246,.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.3)', fontWeight: 700 }}>
                🔍 resultado filtrado
              </span>
            )}
            {(() => {
              const nv = base.filter(p => !visitados.has(p.id)).length;
              if (!nv) return null;
              return (
                <>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(59,130,246,.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,.3)', fontWeight: 700 }}>● {nv} não {nv === 1 ? 'visto' : 'vistos'}</span>
                  {onMarcarTudoVisto && (
                    <button
                      className="btn-ghost"
                      onClick={() => onMarcarTudoVisto(base.map(p => p.id))}
                      style={{ fontSize: 11, padding: '2px 8px', color: 'var(--muted)' }}
                    >
                      ✓ Marcar tudo como lido
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className={showFiltrosAvancados ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setShowFiltrosAvancados(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🔍 Filtros avançados
          </button>
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

      {/* Filtros simples */}
      {tipo === 'juridico' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {['Todos', 'Cível', 'Trabalhista'].map(r => (
            <button key={r} onClick={() => { setFiltroRamo(r); resetPagina(); }}
              style={{ padding: '7px 18px', borderRadius: 8, border: filtroRamo === r ? '1px solid var(--blue)' : '1px solid var(--border)', background: filtroRamo === r ? 'rgba(59,130,246,.15)' : 'var(--surface)', color: filtroRamo === r ? '#93c5fd' : 'var(--muted)', fontSize: 13, fontWeight: filtroRamo === r ? 700 : 400, cursor: 'pointer' }}>
              {r === 'Cível' ? '🏛 Cível' : r === 'Trabalhista' ? '👷 Trabalhista' : '📋 Todos'}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setShowSugestoes(true); resetPagina(); }}
            onFocus={() => setShowSugestoes(true)}
            placeholder="Buscar por número ou parte..."
            style={{ width: 240 }}
          />
          {showSugestoes && sugestoes.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, minWidth: 320, maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,.4)', overflow: 'hidden' }}>
              {sugestoes.map(p => (
                <div key={p.id}
                  onClick={() => { setProcessoAberto(p); setView('detalhe'); setBusca(''); setShowSugestoes(false); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#93c5fd' }}>{p.numero}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.parte}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <input value={filtroParte} onChange={e => { setFiltroParte(e.target.value); resetPagina(); }} placeholder="Filtrar por parte..." style={{ width: 200 }} />
        <select value={filtroFase} onChange={e => { setFiltroFase(e.target.value); resetPagina(); }} style={{ width: 150 }}>
          <option>Todos</option>
          <option>Conhecimento</option>
          <option>Execução</option>
          <option>Arquivado</option>
        </select>
        <select value={filtroVisto} onChange={e => { setFiltroVisto(e.target.value); resetPagina(); }} style={{ width: 140 }}>
          <option>Todos</option>
          <option>Não vistos</option>
          <option>Vistos</option>
        </select>
      </div>

      {/* Filtros avançados — colapsável, abaixo dos filtros simples */}
      {showFiltrosAvancados && (
        <div style={{ marginBottom: 16 }}>
          <FiltrosAvancados
            onPesquisar={handlePesquisarAvancado}
            onLimpar={handleLimparAvancado}
            onFechar={() => setShowFiltrosAvancados(false)}
          />
        </div>
      )}

      {/* ── MOBILE: cards ── */}
      {mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listaPagina.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum processo encontrado.</div>
            : listaPagina.map(p => {
              const fs = FASE_STYLE[p.fase] || {};
              const proxAud = (p.audiencias || []).filter(a => a.data >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.data.localeCompare(b.data))[0];
              return (
                <div key={p.id} onClick={() => { setProcessoAberto(p); setView('detalhe'); }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, cursor: 'pointer', borderLeft: `3px solid ${fs.color || 'var(--border)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
                      {!visitados.has(p.id) && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <Badge label={fs.label || p.fase} color={fs.color} bg={fs.bg} />
                      <Badge label={p.tribunal} color="#94a3b8" bg="rgba(148,163,184,.1)" />
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.parte}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.tramitacao}</div>
                  {(proxAud || p.valorCausa) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                      {proxAud && <span style={{ color: 'var(--green)' }}>📅 {fmtData(proxAud.data)}</span>}
                      {p.valorCausa && <span style={{ color: 'var(--green)', fontWeight: 600 }}>{Number(p.valorCausa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      ) : (
        /* ── DESKTOP: tabela ── */
        <div>
          {/* Barra acima da tabela com botão de colunas */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setShowColunas(v => !v); }}
              title="Adicionar / remover colunas"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (showColunas ? 'var(--blue)' : 'var(--border)'), background: showColunas ? 'rgba(59,130,246,.15)' : 'var(--surface)', color: showColunas ? '#93c5fd' : 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ⊞ Colunas
            </button>
            {showColunas && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, minWidth: 190, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.06em' }}>Colunas visíveis</div>
                {COLUNAS.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: c.fixo ? 'default' : 'pointer', fontSize: 13, color: c.fixo ? 'var(--muted)' : 'var(--text)', borderRadius: 6 }}>
                    <input type="checkbox" checked={col(c.id)} disabled={c.fixo} onChange={() => toggleColuna(c.id)}
                      style={{ accentColor: 'var(--blue)', width: 14, height: 14 }} />
                    {c.label}
                    {c.fixo && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>fixo</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Número</th>
                  {col('fase')          && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Fase</th>}
                  {col('parte')         && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Parte contrária</th>}
                  {col('tribunal')      && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Tribunal / Órgão</th>}
                  {col('tramitacao')    && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Tramitação</th>}
                  {col('ajuizamento')   && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Ajuizamento</th>}
                  {col('valor')         && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Valor</th>}
                  {col('audiencias')    && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Audiências</th>}
                  {col('uf')            && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>UF</th>}
                  {col('instancia')     && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Instância</th>}
                  {col('tipoDocumento') && <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Tipo de doc.</th>}
                </tr>
              </thead>
              <tbody>
                {listaPagina.length === 0
                  ? <tr><td colSpan={1 + colunasVisiveis.size} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum processo encontrado.</td></tr>
                  : listaPagina.map(p => {
                    const fs = FASE_STYLE[p.fase] || {};
                    const proxAud = (p.audiencias || []).filter(a => a.data >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.data.localeCompare(b.data))[0];
                    return (
                      <tr key={p.id} onClick={() => { setProcessoAberto(p); setView('detalhe'); }}
                        style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, color: '#93c5fd', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {!visitados.has(p.id) && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, display: 'inline-block' }} title="Não visto" />}
                            {p.numero}
                          </div>
                        </td>
                        {col('fase')          && <td style={{ padding: '11px 14px' }}><Badge label={fs.label || p.fase} color={fs.color} bg={fs.bg} /></td>}
                        {col('parte')         && <td style={{ padding: '11px 14px', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.parte}</td>}
                        {col('tribunal')      && <td style={{ padding: '11px 14px' }}><Badge label={p.tribunal} color="#94a3b8" bg="rgba(148,163,184,.1)" /></td>}
                        {col('tramitacao')    && <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tramitacao}</td>}
                        {col('ajuizamento')   && <td style={{ padding: '11px 14px', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--muted)' }}>{p.dataAjuizamento ? fmtData(p.dataAjuizamento) : <span>—</span>}</td>}
                        {col('valor')         && <td style={{ padding: '11px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>{p.valorCausa ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>{Number(p.valorCausa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>}
                        {col('audiencias')    && <td style={{ padding: '11px 14px', fontSize: 12 }}>{proxAud ? <span style={{ color: 'var(--green)' }}>📅 {fmtData(proxAud.data)}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>}
                        {col('uf')            && <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--muted)' }}>{p.uf || <span>—</span>}</td>}
                        {col('instancia')     && <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{p.instancia || <span>—</span>}</td>}
                        {col('tipoDocumento') && <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{p.tipoDocumento || <span>—</span>}</td>}
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
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
            {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, lista.length)} de {lista.length}
          </span>
        </div>
      )}
    </div>
  );
}
