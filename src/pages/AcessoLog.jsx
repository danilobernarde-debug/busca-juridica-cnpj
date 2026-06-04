import { useState, useEffect } from 'react';
import { carregarLogs } from '../lib/accessLog.js';

const DISPOSITIVO_ICON = { Mobile: '📱', Desktop: '💻' };
const BROWSER_ICON = { Chrome: '🟡', Firefox: '🦊', Safari: '🔵', Edge: '🔷', Opera: '🔴' };

function fmtDataHora(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function AcessoLog({ sbClient, user }) {
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarLogs(sbClient).then(data => { setLogs(data); setCarregando(false); });
  }, []);

  const lista = busca
    ? logs.filter(l =>
        (l.user_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (l.user_email || '').toLowerCase().includes(busca.toLowerCase()) ||
        (l.cidade || '').toLowerCase().includes(busca.toLowerCase())
      )
    : logs;

  // Agrupar por usuário para mostrar "último acesso de cada um" no topo
  const ultimosPorUsuario = Object.values(
    logs.reduce((acc, l) => {
      if (!acc[l.user_uuid]) acc[l.user_uuid] = l;
      return acc;
    }, {})
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>🔍 Log de Acessos</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{logs.length} registro(s) — visível apenas para você</div>
      </div>

      {/* Cards de último acesso por usuário */}
      {ultimosPorUsuario.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Último acesso por usuário</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {ultimosPorUsuario.map(l => (
              <div key={l.user_uuid} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {(l.user_nome || l.user_email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.user_nome || l.user_email?.split('@')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.user_email}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>🕐 {fmtDataHora(l.created_at)}</span>
                  {l.cidade && <span>📍 {l.cidade}{l.regiao ? `, ${l.regiao}` : ''}</span>}
                  <span>{DISPOSITIVO_ICON[l.dispositivo] || '💻'} {l.dispositivo} · {BROWSER_ICON[l.navegador] || ''} {l.navegador} · {l.sistema_op}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico completo */}
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        Histórico completo
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar por nome, e-mail ou cidade..." style={{ width: 260, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }} />
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Carregando...</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {['Usuário', 'Quando', 'Localização', 'Dispositivo / Navegador', 'IP'].map(h =>
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum registro.</td></tr>
              ) : lista.map(l => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{l.user_nome || l.user_email?.split('@')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.user_email}</div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDataHora(l.created_at)}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13 }}>
                    {l.cidade ? `📍 ${l.cidade}${l.regiao ? `, ${l.regiao}` : ''}${l.pais ? ` · ${l.pais}` : ''}` : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13 }}>
                    {DISPOSITIVO_ICON[l.dispositivo] || '💻'} {l.dispositivo} &nbsp;·&nbsp; {BROWSER_ICON[l.navegador] || ''} {l.navegador} &nbsp;·&nbsp; {l.sistema_op}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{l.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
