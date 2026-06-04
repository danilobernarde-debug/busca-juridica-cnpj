import { fmtData } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import StatCard from '../components/StatCard.jsx';

export default function Dashboard({ processos, setView, setProcessoAberto }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const ativos = processos.filter(p => p.fase !== 'Arquivado');
  const execucao = processos.filter(p => p.fase === 'Execução');
  const juridicos = processos.filter(p => p.tipo === 'juridico' && p.fase !== 'Arquivado');
  const adms = processos.filter(p => p.tipo === 'administrativo' && p.fase !== 'Arquivado');

  const audienciasProximas = processos.flatMap(p =>
    (p.audiencias || []).filter(a => a.data >= hoje && a.data <= em7dias).map(a => ({ ...a, processo: p }))
  ).sort((a, b) => a.data.localeCompare(b.data));

  const audienciasHoje = processos.flatMap(p =>
    (p.audiencias || []).filter(a => a.data === hoje).map(a => ({ ...a, processo: p }))
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
        Olá 👋 &nbsp;<span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 400 }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {audienciasHoje.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🔔</span>
          <div>
            <div style={{ fontWeight: 700, color: '#f87171', fontSize: 14 }}>Audiência hoje!</div>
            {audienciasHoje.map(a => (
              <div key={a.id} style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>
                {a.hora && `${a.hora} — `}{a.tipo} · <span style={{ color: 'var(--muted)' }}>{a.processo.parte}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon="📁" label="Processos ativos" value={ativos.length} />
        <StatCard icon="🔴" label="Em execução" value={execucao.length} color="var(--red)" onClick={() => setView('juridico')} />
        <StatCard icon="⚖️" label="Jurídicos ativos" value={juridicos.length} color="#a78bfa" onClick={() => setView('juridico')} />
        <StatCard icon="🏛️" label="Administrativos" value={adms.length} color="var(--orange)" onClick={() => setView('adm')} />
        <StatCard icon="📅" label="Audiências (7 dias)" value={audienciasProximas.length} color="var(--green)" onClick={() => setView('agenda')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            📅 Próximas audiências <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>— 7 dias</span>
          </div>
          {audienciasProximas.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma audiência nos próximos 7 dias.</div>
            : audienciasProximas.map(a => (
              <div key={a.id} onClick={() => { setProcessoAberto(a.processo); setView('detalhe'); }}
                style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'center', minWidth: 40 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)', lineHeight: 1 }}>{a.data.slice(8)}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(a.data.slice(5, 7)) - 1]}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.tipo} {a.hora && <span style={{ color: 'var(--blue)', fontWeight: 400 }}>· {a.hora}</span>}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.processo.parte}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.processo.tribunal} · {a.processo.tramitacao}</div>
                </div>
              </div>
            ))
          }
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🔴 Execuções em andamento</div>
          {execucao.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma execução ativa.</div>
            : execucao.slice(0, 8).map(p => (
              <div key={p.id} onClick={() => { setProcessoAberto(p); setView('detalhe'); }}
                style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#93c5fd', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero}</div>
                  <Badge label={p.tribunal} color="#94a3b8" bg="rgba(148,163,184,.1)" size={10} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.parte}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
