import { useState } from 'react';
import { gerarLinksConsulta } from '../../lib/consultaLinks.js';
import { sbClient } from '../../lib/supabase.js';

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

const RESULTADO_STYLE = {
  novidade: { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.3)', color: 'var(--green)' },
  ok: { bg: 'rgba(148,163,184,.1)', border: 'rgba(148,163,184,.3)', color: 'var(--muted)' },
  'nao-suportado': { bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.3)', color: '#fb923c' },
  erro: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.3)', color: 'var(--red)' },
};

export default function TabConsulta({ processo, onRecarregar }) {
  const [copiado, setCopiado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState(null);
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

  const verificarAgora = async () => {
    if (!sbClient) return;
    setVerificando(true);
    setResultado(null);
    try {
      const { data: { session } } = await sbClient.auth.getSession();
      const resp = await fetch(`/api/sync-datajud?processoId=${processo.id}`, {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await resp.json();
      if (!resp.ok) {
        setResultado({ tipo: 'erro', texto: json.error || 'Erro ao verificar.' });
      } else if (json.ignorados > 0) {
        setResultado({ tipo: 'nao-suportado', texto: 'Este órgão ainda não é suportado pela sincronização automática (só TRT e TJ, por enquanto).' });
      } else if (json.erros?.length) {
        setResultado({ tipo: 'erro', texto: json.erros[0] });
      } else if (json.comNovidade > 0) {
        setResultado({ tipo: 'novidade', texto: 'Movimentação nova encontrada — a aba Movimentações foi atualizada.' });
        onRecarregar?.();
      } else {
        setResultado({ tipo: 'ok', texto: 'Nenhuma novidade — processo já está atualizado.' });
      }
    } catch (e) {
      setResultado({ tipo: 'erro', texto: e.message });
    } finally {
      setVerificando(false);
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
        {sbClient && (
          <button className="btn-primary" onClick={verificarAgora} disabled={verificando}>
            {verificando ? '⏳ Verificando...' : '🔄 Verificar agora'}
          </button>
        )}
      </div>

      {resultado && (
        <div style={{ background: RESULTADO_STYLE[resultado.tipo].bg, border: `1px solid ${RESULTADO_STYLE[resultado.tipo].border}`, color: RESULTADO_STYLE[resultado.tipo].color, borderRadius: 10, padding: '10px 14px', fontSize: 12.5, marginBottom: 16 }}>
          {resultado.texto}
        </div>
      )}

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
