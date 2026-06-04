const W_CAMPO    = 162;
const W_OPERADOR = 108;

export default function FiltroRow({ filtro, campos, onChange, onRemove }) {
  const config = campos[filtro.campo];

  const handleCampo = (campo) => {
    const novaConfig = campos[campo];
    onChange(filtro.id, {
      campo,
      operador: novaConfig?.operadores[0] ?? '',
      valor: '',
      valor2: '',
    });
  };

  const handleOperador = (operador) => {
    onChange(filtro.id, { operador, valor: '', valor2: '' });
  };

  const renderValor = () => {
    if (!config) return null;
    const { tipo, opcoes } = config;

    if (tipo === 'select') {
      return (
        <select
          value={filtro.valor}
          onChange={e => onChange(filtro.id, { valor: e.target.value })}
        >
          <option value="">Selecione...</option>
          {opcoes?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }

    if (tipo === 'data') {
      return (
        <input
          type="date"
          value={filtro.valor}
          onChange={e => onChange(filtro.id, { valor: e.target.value })}
        />
      );
    }

    if (tipo === 'numero') {
      if (filtro.operador === 'entre') {
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
            <input
              type="number"
              placeholder="De"
              style={{ flex: 1 }}
              value={filtro.valor}
              onChange={e => onChange(filtro.id, { valor: e.target.value })}
            />
            <span style={{ color: 'var(--muted)', fontSize: 12, flexShrink: 0 }}>e</span>
            <input
              type="number"
              placeholder="Até"
              style={{ flex: 1 }}
              value={filtro.valor2}
              onChange={e => onChange(filtro.id, { valor2: e.target.value })}
            />
          </div>
        );
      }
      return (
        <input
          type="number"
          placeholder="Valor..."
          value={filtro.valor}
          onChange={e => onChange(filtro.id, { valor: e.target.value })}
        />
      );
    }

    return (
      <input
        type="text"
        placeholder="Valor..."
        value={filtro.valor}
        onChange={e => onChange(filtro.id, { valor: e.target.value })}
      />
    );
  };

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px',
    }}>
      <select
        style={{ width: W_CAMPO, flexShrink: 0 }}
        value={filtro.campo}
        onChange={e => handleCampo(e.target.value)}
      >
        {Object.entries(campos).map(([key, c]) => (
          <option key={key} value={key}>{c.label}</option>
        ))}
      </select>

      <select
        style={{ width: W_OPERADOR, flexShrink: 0 }}
        value={filtro.operador}
        onChange={e => handleOperador(e.target.value)}
      >
        {config?.operadores.map(op => <option key={op} value={op}>{op}</option>)}
      </select>

      <div style={{ flex: 1, minWidth: 0 }}>
        {renderValor()}
      </div>

      <button
        onClick={() => onRemove(filtro.id)}
        className="btn-ghost"
        title="Remover filtro"
        style={{ flexShrink: 0, padding: '4px 8px', fontSize: 14 }}
      >
        ✕
      </button>
    </div>
  );
}
