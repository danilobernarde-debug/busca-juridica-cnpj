import { fmtDataHora, fmtData } from '../../lib/utils.js';
import { TIPO_STYLE, POLO_LABEL, POLO_COLOR } from '../../constants/styles.js';

export default function TabInfo({ processo }) {
  const fmtValor = (v) => v
    ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  const rows = [
    ['Número',          processo.numero],
    ['Tipo',            TIPO_STYLE[processo.tipo]?.label],
    ['Fase',            processo.fase],
    ['Tribunal/Órgão',  processo.tribunal],
    ['UF',              processo.uf],
    ['Vara/Tramitação', processo.tramitacao],
    ['Instância',       processo.instancia],
    ['Ajuizamento',     processo.dataAjuizamento ? fmtData(processo.dataAjuizamento) : null],
    ['Valor da causa',  fmtValor(processo.valorCausa)],
    ['Parte contrária', processo.parte],
    ['Criado em',       fmtDataHora(processo.createdAt)],
    ['Atualizado',      fmtDataHora(processo.updatedAt)],
  ];

  const partes = processo.partes || [];
  const assuntos = processo.assuntos || [];

  return (
    <div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 160, fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>{k}</div>
            <div style={{ fontSize: 13 }}>{v || '—'}</div>
          </div>
        ))}
      </div>

      {assuntos.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>Assuntos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {assuntos.map(a => (
              <span key={a} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'rgba(167,139,250,.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,.3)', fontWeight: 600 }}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {partes.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Partes</div>
          {partes.map(pt => (
            <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: `1px solid ${POLO_COLOR[pt.polo]}40`, color: POLO_COLOR[pt.polo], fontWeight: 700, whiteSpace: 'nowrap' }}>{POLO_LABEL[pt.polo] || pt.polo}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{pt.nome}</div>
                {pt.documento && <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 1 }}>{pt.documento}</div>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pt.tipo_pessoa === 'juridica' ? 'PJ' : pt.tipo_pessoa === 'fisica' ? 'PF' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
