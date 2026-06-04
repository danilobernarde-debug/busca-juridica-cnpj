import { useState, useCallback } from 'react';
import { CAMPOS_PADRAO } from './campos.js';
import { converterFiltrosParaSupabase, filtrarArray } from './supabaseConverter.js';
import FiltroRow from './FiltroRow.jsx';

export { converterFiltrosParaSupabase, filtrarArray, CAMPOS_PADRAO };

function criarFiltroVazio(campos) {
  const primeiroCampo = Object.keys(campos)[0] ?? '';
  const config = campos[primeiroCampo];
  return {
    id: crypto.randomUUID(),
    campo: primeiroCampo,
    operador: config?.operadores[0] ?? '',
    valor: '',
    valor2: '',
  };
}

export default function FiltrosAvancados({
  campos = CAMPOS_PADRAO,
  onPesquisar,
  onLimpar,
  onFechar,
  carregando = false,
}) {
  const [filtros, setFiltros] = useState([]);

  const adicionarFiltro = useCallback(() => {
    setFiltros(prev => [...prev, criarFiltroVazio(campos)]);
  }, [campos]);

  const removerFiltro = useCallback((id) => {
    setFiltros(prev => prev.filter(f => f.id !== id));
  }, []);

  const atualizarFiltro = useCallback((id, changes) => {
    setFiltros(prev => prev.map(f => f.id === id ? { ...f, ...changes } : f));
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros([]);
    onLimpar?.();
  }, [onLimpar]);

  const fechar = useCallback(() => {
    setFiltros([]);
    onLimpar?.();
    onFechar?.();
  }, [onLimpar, onFechar]);

  const pesquisar = useCallback(() => {
    const preenchidos = filtros.filter(f => f.valor !== '' || f.operador === 'entre');
    onPesquisar(preenchidos);
  }, [filtros, onPesquisar]);

  const temFiltros = filtros.length > 0;
  const preenchidos = filtros.filter(f => f.valor !== '' || f.operador === 'entre').length;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          🔍 Filtros avançados
        </span>
        {temFiltros && (
          <span style={{
            fontSize: 10, background: 'rgba(59,130,246,.18)', color: '#93c5fd',
            borderRadius: 99, padding: '2px 8px', fontWeight: 700,
          }}>
            {filtros.length} filtro{filtros.length !== 1 ? 's' : ''}
          </span>
        )}
        {onFechar && (
          <button
            onClick={fechar}
            className="btn-ghost"
            title="Fechar filtros avançados"
            style={{ marginLeft: 'auto', padding: '2px 7px', fontSize: 15, lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Linhas */}
      {temFiltros && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtros.map((filtro, idx) => (
            <div key={filtro.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 34, flexShrink: 0, textAlign: 'center' }}>
                {idx > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '2px 6px', letterSpacing: 1,
                  }}>
                    E
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <FiltroRow
                  filtro={filtro}
                  campos={campos}
                  onChange={atualizarFiltro}
                  onRemove={removerFiltro}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={adicionarFiltro}
          style={{
            background: 'transparent', border: '1px dashed var(--border)',
            color: '#93c5fd', borderRadius: 7, padding: '7px 14px',
            fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}
        >
          + Adicionar filtro
        </button>

        {temFiltros && (
          <>
            <div style={{ flex: 1 }} />
            <button
              onClick={limparFiltros}
              className="btn-secondary"
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              Limpar filtros
            </button>
            <button
              onClick={pesquisar}
              disabled={carregando || preenchidos === 0}
              className="btn-primary"
              style={{ fontSize: 13, padding: '7px 20px' }}
            >
              {carregando ? 'Pesquisando...' : `Pesquisar${preenchidos > 0 ? ` (${preenchidos})` : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
