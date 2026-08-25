import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fmtDataHora } from '../lib/utils.js';
import { sbClient } from '../lib/supabase.js';

const RESULTADO_STYLE = {
  novidade: { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.3)', color: 'var(--green)' },
  ok: { bg: 'rgba(148,163,184,.1)', border: 'rgba(148,163,184,.3)', color: 'var(--muted)' },
  erro: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.3)', color: 'var(--red)' },
};

export default function NotificacaoSino({ notificacoes, onAbrir, onMarcarTodasLidas, onVerificacaoConcluida }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const verificarTudo = async () => {
    if (!sbClient) return;
    setVerificando(true);
    setResultado(null);
    try {
      const { data: { session } } = await sbClient.auth.getSession();
      const resp = await fetch('/api/sync-datajud', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await resp.json();
      if (!resp.ok) {
        setResultado({ tipo: 'erro', texto: json.error || 'Erro ao verificar.' });
      } else {
        const ignorados = json.ignorados > 0 ? ` (${json.ignorados} ignorado(s) — órgão não suportado)` : '';
        if (json.erros?.length) {
          setResultado({ tipo: 'erro', texto: `${json.verificados} verificado(s), ${json.erros.length} com erro. Ex: ${json.erros[0]}` });
        } else if (json.comNovidade > 0) {
          setResultado({ tipo: 'novidade', texto: `${json.verificados} processo(s) verificado(s) — ${json.comNovidade} com movimentação nova${ignorados}.` });
        } else {
          setResultado({ tipo: 'ok', texto: `${json.verificados} processo(s) verificado(s) — nenhuma novidade${ignorados}.` });
        }
      }
      onVerificacaoConcluida?.();
    } catch (e) {
      setResultado({ tipo: 'erro', texto: e.message });
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-notif-dropdown]')) return;
      setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  const abrir = () => {
    if (!aberto && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const largura = 320;
      setPos({
        top: r.bottom + 6,
        left: Math.min(r.left, window.innerWidth - largura - 10),
      });
    }
    setAberto(a => !a);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button ref={btnRef} onClick={abrir}
        style={{ position: 'relative', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 18, padding: '4px 6px', cursor: 'pointer', lineHeight: 1 }}
        title="Notificações">
        🔔
        {notificacoes.length > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--red)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 15, textAlign: 'center' }}>
            {notificacoes.length > 9 ? '9+' : notificacoes.length}
          </span>
        )}
      </button>

      {aberto && pos && createPortal(
        <div data-notif-dropdown style={{ position: 'fixed', top: pos.top, left: pos.left, width: 320, maxHeight: 420, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.4)', zIndex: 1000 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Notificações</span>
            {notificacoes.length > 0 && (
              <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { onMarcarTodasLidas(); setAberto(false); }}>
                Marcar tudo como lido
              </button>
            )}
          </div>

          {sbClient && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <button className="btn-secondary" onClick={verificarTudo} disabled={verificando} style={{ width: '100%', fontSize: 12 }}>
                {verificando ? '⏳ Verificando processos...' : '🔄 Verificar processos agora'}
              </button>
              {verificando && (
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6, textAlign: 'center' }}>Pode levar alguns minutos — só processos TRT/TJ/TRF.</div>
              )}
              {resultado && !verificando && (
                <div style={{ background: RESULTADO_STYLE[resultado.tipo].bg, border: `1px solid ${RESULTADO_STYLE[resultado.tipo].border}`, color: RESULTADO_STYLE[resultado.tipo].color, borderRadius: 8, padding: '8px 10px', fontSize: 11.5, marginTop: 8, lineHeight: 1.4 }}>
                  {resultado.texto}
                </div>
              )}
            </div>
          )}

          {notificacoes.length === 0 && (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Nenhuma notificação nova.</div>
          )}

          {notificacoes.map(n => (
            <button key={n.id} onClick={() => { onAbrir(n); setAberto(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
              <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{n.mensagem}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>{fmtDataHora(n.created_at)}</div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
