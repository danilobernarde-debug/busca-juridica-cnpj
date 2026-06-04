function toNumero(valor) {
  const n = parseFloat(valor.replace(',', '.'));
  return isNaN(n) ? valor : n;
}

function converterFiltro(filtro, campos) {
  const config = campos[filtro.campo];
  if (!config || !filtro.valor) return null;

  const { coluna, tipo } = config;
  const valor = tipo === 'numero' ? toNumero(filtro.valor) : filtro.valor;

  switch (filtro.operador) {
    case 'contém':   return { coluna, metodo: 'ilike', valor: `%${valor}%` };
    case 'igual':
    case '=':        return { coluna, metodo: 'eq',    valor };
    case 'diferente': return { coluna, metodo: 'neq',  valor };
    case '>':        return { coluna, metodo: 'gt',    valor };
    case '<':        return { coluna, metodo: 'lt',    valor };
    case '>=':       return { coluna, metodo: 'gte',   valor };
    case '<=':       return { coluna, metodo: 'lte',   valor };
    case 'antes':    return { coluna, metodo: 'lt',    valor };
    case 'depois':   return { coluna, metodo: 'gt',    valor };
    case 'entre': {
      if (!filtro.valor2) return null;
      const valor2 = tipo === 'numero' ? toNumero(filtro.valor2) : filtro.valor2;
      return { coluna, metodo: 'between', valor, valor2 };
    }
    default: return null;
  }
}

function aplicarFiltroNaQuery(query, fc) {
  switch (fc.metodo) {
    case 'eq':      return query.eq(fc.coluna, fc.valor);
    case 'neq':     return query.neq(fc.coluna, fc.valor);
    case 'ilike':   return query.ilike(fc.coluna, fc.valor);
    case 'gt':      return query.gt(fc.coluna, fc.valor);
    case 'lt':      return query.lt(fc.coluna, fc.valor);
    case 'gte':     return query.gte(fc.coluna, fc.valor);
    case 'lte':     return query.lte(fc.coluna, fc.valor);
    case 'between': return query.gte(fc.coluna, fc.valor).lte(fc.coluna, fc.valor2);
    default:        return query;
  }
}

/**
 * Converte filtros da UI em filtros prontos para Supabase.
 */
export function converterFiltrosParaSupabase(filtros, campos) {
  const filtrosConvertidos = filtros
    .map(f => converterFiltro(f, campos))
    .filter(Boolean);

  return {
    filtrosConvertidos,
    aplicarNaQuery: (query) =>
      filtrosConvertidos.reduce((q, fc) => aplicarFiltroNaQuery(q, fc), query),
  };
}

/**
 * Filtra um array de objetos JS em memória usando os filtros da UI.
 * Usa `propriedade` (camelCase) do campos config em vez de `coluna` (snake_case do DB).
 */
export function filtrarArray(array, filtros, campos) {
  const convertidos = filtros
    .map(f => ({ fc: converterFiltro(f, campos), config: campos[f.campo] }))
    .filter(({ fc }) => fc !== null);

  if (!convertidos.length) return array;

  return array.filter(item =>
    convertidos.every(({ fc, config }) => {
      const prop = config?.propriedade || fc.coluna;
      const val = item[prop];

      if (config?.isArray) {
        const arr = Array.isArray(val) ? val : [];
        const needle = String(fc.valor).replace(/%/g, '').toLowerCase();
        // arrayField: busca dentro de um campo específico de cada objeto do array
        const getText = config.arrayField
          ? v => String(v?.[config.arrayField] ?? '').toLowerCase()
          : v => String(v).toLowerCase();
        switch (fc.metodo) {
          case 'ilike': return arr.some(v => getText(v).includes(needle));
          case 'eq':    return arr.some(v => getText(v) === needle);
          case 'neq':   return arr.every(v => getText(v) !== needle);
          default:      return true;
        }
      }

      if (val === undefined || val === null) return false;

      switch (fc.metodo) {
        case 'eq':      return String(val).toLowerCase() === String(fc.valor).toLowerCase();
        case 'neq':     return String(val).toLowerCase() !== String(fc.valor).toLowerCase();
        case 'ilike':   return String(val).toLowerCase().includes(String(fc.valor).replace(/%/g, '').toLowerCase());
        case 'gt':      return Number(val) > Number(fc.valor);
        case 'lt':      return Number(val) < Number(fc.valor);
        case 'gte':     return Number(val) >= Number(fc.valor);
        case 'lte':     return Number(val) <= Number(fc.valor);
        case 'between': return Number(val) >= Number(fc.valor) && Number(val) <= Number(fc.valor2);
        default:        return true;
      }
    })
  );
}
