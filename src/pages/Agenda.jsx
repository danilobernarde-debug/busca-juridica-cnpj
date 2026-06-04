import { useState } from 'react';
import { fmtDataExtenso } from '../lib/utils.js';
import { TIPO_STYLE } from '../constants/styles.js';
import Badge from '../components/Badge.jsx';

export default function Agenda({ processos, setProcessoAberto, setView }) {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [mesDate, setMesDate] = useState(() => new Date());

  const mudarMes = (delta) => {
    const d = new Date(mesDate.getFullYear(), mesDate.getMonth() + delta, 1);
    setMesDate(d);
    setMes(d.toISOString().slice(0, 7));
  };

  const audiencias = processos.flatMap(p =>
    (p.audiencias || []).filter(a => a.data.startsWith(mes)).map(a => ({ ...a, processo: p }))
  ).sort((a, b) => a.data.localeCompare(b.data));

  const dias = {};
  audiencias.forEach(a => { if (!dias[a.data]) dias[a.data] = []; dias[a.data].push(a); });

  const hoje = new Date().toISOString().slice(0, 10);
  const nomeMes = mesDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn-secondary" onClick={() => mudarMes(-1)}>←</button>
        <div style={{ fontWeight: 800, fontSize: 18, textTransform: 'capitalize', minWidth: 200, textAlign: 'center' }}>{nomeMes}</div>
        <button className="btn-secondary" onClick={() => mudarMes(1)}>→</button>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{audiencias.length} audiência(s) neste mês</div>
      </div>

      {Object.keys(dias).length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div>Nenhuma audiência em {nomeMes}.</div>
        </div>
      ) : (
        Object.entries(dias).map(([data, auds]) => (
          <div key={data} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: data === hoje ? 'var(--green)' : 'var(--text)' }}>
                {data === hoje && '🟢 '}{fmtDataExtenso(data)}
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            {auds.map(a => (
              <div key={a.id} onClick={() => { setProcessoAberto(a.processo); setView('detalhe'); }}
                style={{ background: 'var(--surface)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 6, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,.3)'}>
                <div style={{ fontWeight: 700, color: 'var(--blue)', minWidth: 50, fontSize: 14 }}>{a.hora || '—'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.tipo}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.processo.parte} · {a.processo.tribunal}</div>
                  {a.local && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>📍 {a.local}</div>}
                </div>
                <Badge label={TIPO_STYLE[a.processo.tipo]?.label} color={TIPO_STYLE[a.processo.tipo]?.color} bg={TIPO_STYLE[a.processo.tipo]?.bg} />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
