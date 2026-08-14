import { useState } from 'react';
import { sbClient } from '../../lib/supabase.js';

// Dispara /api/sync-datajud só para este processo (botão "Verificar agora").
export function useVerificarDataJud(processo, onRecarregar) {
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState(null);

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
        setResultado({ tipo: 'novidade', texto: 'Movimentação nova encontrada — a lista foi atualizada.' });
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

  return { verificando, resultado, verificarAgora };
}

export const RESULTADO_STYLE = {
  novidade: { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.3)', color: 'var(--green)' },
  ok: { bg: 'rgba(148,163,184,.1)', border: 'rgba(148,163,184,.3)', color: 'var(--muted)' },
  'nao-suportado': { bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.3)', color: '#fb923c' },
  erro: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.3)', color: 'var(--red)' },
};

export function ResultadoVerificacao({ resultado }) {
  if (!resultado) return null;
  const s = RESULTADO_STYLE[resultado.tipo];
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: 10, padding: '10px 14px', fontSize: 12.5, marginBottom: 16 }}>
      {resultado.texto}
    </div>
  );
}
