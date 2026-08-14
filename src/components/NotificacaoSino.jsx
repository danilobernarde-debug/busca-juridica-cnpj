import { useState, useRef, useEffect } from 'react';
import { fmtDataHora } from '../lib/utils.js';

export default function NotificacaoSino({ notificacoes, onAbrir, onMarcarTodasLidas }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setAberto(a => !a)}
        style={{ position: 'relative', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 18, padding: '4px 6px', cursor: 'pointer', lineHeight: 1 }}
        title="Notificações">
        🔔
        {notificacoes.length > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--red)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 15, textAlign: 'center' }}>
            {notificacoes.length > 9 ? '9+' : notificacoes.length}
          </span>
        )}
      </button>

      {aberto && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, width: 320, maxHeight: 420, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.4)', zIndex: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Notificações</span>
            {notificacoes.length > 0 && (
              <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { onMarcarTodasLidas(); setAberto(false); }}>
                Marcar tudo como lido
              </button>
            )}
          </div>

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
        </div>
      )}
    </div>
  );
}
