import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMobile } from '../lib/utils.js';
import { NAV } from '../constants/styles.js';
import NotificacaoSino from './NotificacaoSino.jsx';

const NAV_PATHS = {
  dashboard: '/',
  juridico: '/juridico',
  adm: '/adm',
  agenda: '/agenda',
  movimentacoes: '/movimentacoes',
  usuarios: '/usuarios',
  config: '/config',
  acessos: '/acessos',
};

export default function Sidebar({ counts, user, onLogout, isSuperAdmin, notificacoes = [], onAbrirNotificacao, onMarcarTodasNotificacoesLidas }) {
  const isOwner = user?.email === 'danilo@dbmachado.com';
  const email = user?.email || '';
  const nome = email.split('@')[0];
  const mobile = useMobile();
  const [aberta, setAberta] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const currentView = pathname === '/' ? 'dashboard'
    : Object.entries(NAV_PATHS).find(([, path]) => path !== '/' && pathname.startsWith(path))?.[0] || '';

  const navegar = (id) => {
    navigate(NAV_PATHS[id] || '/');
    if (mobile) setAberta(false);
  };

  const itens = NAV.filter(n => (!n.adminOnly || isSuperAdmin) && (!n.ownerOnly || isOwner));

  const sidebar = (
    <div style={{
      width: 200, background: '#131f35', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100dvh', overflow: 'hidden',
      ...(mobile ? {
        position: 'fixed', left: 0, top: 0, zIndex: 300,
        transform: aberta ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease',
        boxShadow: aberta ? '4px 0 24px rgba(0,0,0,.5)' : 'none',
      } : {}),
    }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>⚖️ DB Machado</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Sistema Jurídico</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NotificacaoSino notificacoes={notificacoes} onAbrir={onAbrirNotificacao} onMarcarTodasLidas={onMarcarTodasNotificacoesLidas} />
          {mobile && (
            <button onClick={() => setAberta(false)} style={{ background: 'transparent', color: 'var(--muted)', fontSize: 20, padding: '4px 8px' }}>✕</button>
          )}
        </div>
      </div>

      <nav style={{ flex: 1, minHeight: 0, padding: '8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {itens.map(n => {
          const active = currentView === n.id;
          const count = counts[n.id];
          return (
            <button key={n.id} onClick={() => navegar(n.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: active ? 'rgba(59,130,246,.2)' : 'transparent', color: active ? '#93c5fd' : 'var(--muted)', fontWeight: active ? 700 : 400, fontSize: 14, transition: 'all .15s' }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {count > 0 && <span style={{ fontSize: 10, background: active ? 'var(--blue)' : 'var(--surface2)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>{count}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
        <button onClick={onLogout} style={{ width: '100%', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', borderRadius: 6, padding: '8px 0', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          Sair
        </button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: '#131f35', borderBottom: '1px solid var(--border)', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
          <button onClick={() => setAberta(true)} style={{ background: 'transparent', color: 'var(--text)', fontSize: 22, padding: '4px 8px', lineHeight: 1 }}>☰</button>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>⚖️ DB Machado</div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#93c5fd', fontWeight: 600 }}>
            {itens.find(n => n.id === currentView)?.icon} {itens.find(n => n.id === currentView)?.label}
          </div>
          <NotificacaoSino notificacoes={notificacoes} onAbrir={onAbrirNotificacao} onMarcarTodasLidas={onMarcarTodasNotificacoesLidas} />
        </div>

        {aberta && (
          <div onClick={() => setAberta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 299 }} />
        )}

        {sidebar}
      </>
    );
  }

  return sidebar;
}
