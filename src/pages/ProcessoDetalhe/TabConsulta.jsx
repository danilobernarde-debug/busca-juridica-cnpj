import { useState } from 'react';
import { gerarLinksConsulta } from '../../lib/consultaLinks.js';

function LinkCard({ label, url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 8, textDecoration: 'none', color: 'inherit' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all' }}>{url}</div>
      </div>
      <span style={{ color: 'var(--blue)', fontSize: 12, whiteSpace: 'nowrap', padding: '4px 10px', border: '1px solid rgba(59,130,246,.3)', borderRadius: 6 }}>Abrir ↗</span>
    </a>
  );
}

export default function TabConsulta({ processo }) {
  const [copiado, setCopiado] = useState(false);
  const { numeroFormatado, especificos, genericos } = gerarLinksConsulta(processo);

  const copiarNumero = async () => {
    try {
      await navigator.clipboard.writeText(numeroFormatado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // clipboard indisponível — ignora
    }
  };

  return (
    <div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Número do processo</div>
          <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#93c5fd' }}>{numeroFormatado || '—'}</div>
        </div>
        <button className="btn-secondary" onClick={copiarNumero} disabled={!numeroFormatado}>
          {copiado ? '✓ Copiado' : '📋 Copiar número'}
        </button>
      </div>

      {especificos.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
            Consulta direta — {processo.tribunal}
          </div>
          {especificos.map(l => <LinkCard key={l.url} {...l} />)}
        </>
      )}

      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', margin: especificos.length > 0 ? '16px 0 10px' : '0 0 10px' }}>
        Busca geral
      </div>
      {genericos.map(l => <LinkCard key={l.url} {...l} />)}

      {especificos.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
          Não conhecemos o padrão de link direto do órgão "{processo.tribunal || '—'}". Use as buscas acima para localizar a consulta pública.
        </div>
      )}
    </div>
  );
}
