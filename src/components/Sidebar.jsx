import { NAV } from '../constants/styles.js';

export default function Sidebar({ view, setView, counts, user, onLogout, isSuperAdmin }) {
  const email = user?.email || '';
  const nome = email.split('@')[0];

  return (
    <div style={{ width: 200, background: '#131f35', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>⚖️ DB Machado</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Sistema Jurídico <span style={{ opacity: .5 }}>v1.1</span></div>
      </div>
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.filter(n => !n.adminOnly || isSuperAdmin).map(n => {
          const active = view === n.id;
          const count = counts[n.id];
          return (
            <button key={n.id} onClick={() => setView(n.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: active ? 'rgba(59,130,246,.2)' : 'transparent', color: active ? '#93c5fd' : 'var(--muted)', fontWeight: active ? 700 : 400, fontSize: 13, transition: 'all .15s' }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {count > 0 && <span style={{ fontSize: 10, background: active ? 'var(--blue)' : 'var(--surface2)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>{count}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
        <button onClick={onLogout} style={{ width: '100%', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', borderRadius: 6, padding: '6px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          Sair
        </button>
      </div>
    </div>
  );
}
