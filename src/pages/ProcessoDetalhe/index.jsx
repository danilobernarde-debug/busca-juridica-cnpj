import { useState } from 'react';
import { uid, now } from '../../lib/utils.js';
import { FASE_STYLE, TIPO_STYLE } from '../../constants/styles.js';
import { sb_deletarArquivoStorage } from '../../lib/supabase.js';
import Badge from '../../components/Badge.jsx';
import ProcessoForm from '../../components/ProcessoForm.jsx';
import TabNotas from './TabNotas.jsx';
import TabAudiencias from './TabAudiencias.jsx';
import TabPartes from './TabPartes.jsx';
import TabArquivos from './TabArquivos.jsx';
import TabMovimentacoes from './TabMovimentacoes.jsx';
import TabInfo from './TabInfo.jsx';
import TabConsulta from './TabConsulta.jsx';

export default function ProcessoDetalhe({ processo, onUpdate, onDelete, onBack, user }) {
  const [aba, setAba] = useState('notas');
  const [editando, setEditando] = useState(false);

  const autorAtual = user?.email?.split('@')[0] || user?.email || 'Usuário';

  const addNota = (texto) => {
    const nova = { id: uid(), texto, autor: autorAtual, createdAt: now() };
    onUpdate({ ...processo, notas: [...(processo.notas || []), nova], updatedAt: now() });
  };

  const delNota = (id) => {
    onUpdate({ ...processo, notas: (processo.notas || []).filter(n => n.id !== id), updatedAt: now() });
  };

  const editNota = (id, texto) => {
    onUpdate({ ...processo, notas: (processo.notas || []).map(n => n.id === id ? { ...n, texto } : n), updatedAt: now() });
  };

  const addAudiencia = (aud) => {
    onUpdate({ ...processo, audiencias: [...(processo.audiencias || []), { id: uid(), ...aud }], updatedAt: now() });
  };

  const delAudiencia = (id) => {
    onUpdate({ ...processo, audiencias: (processo.audiencias || []).filter(a => a.id !== id), updatedAt: now() });
  };

  const addMovimentacao = (mov) => {
    onUpdate({ ...processo, movimentacoes: [...(processo.movimentacoes || []), { id: uid(), ...mov }], updatedAt: now() });
  };

  const delMovimentacao = (id) => {
    onUpdate({ ...processo, movimentacoes: (processo.movimentacoes || []).filter(m => m.id !== id), updatedAt: now() });
  };

  const addArquivo = (arq) => {
    onUpdate({ ...processo, arquivos: [...(processo.arquivos || []), { id: uid(), ...arq, addedAt: now() }], updatedAt: now() });
  };

  const delArquivo = (id) => {
    const arq = (processo.arquivos || []).find(a => a.id === id);
    if (arq?.url) sb_deletarArquivoStorage(arq.url);
    onUpdate({ ...processo, arquivos: (processo.arquivos || []).filter(a => a.id !== id), updatedAt: now() });
  };

  const fs = FASE_STYLE[processo.fase] || {};
  const ts = TIPO_STYLE[processo.tipo] || {};
  const ABAS = [
    { id: 'notas', label: '📝 Notas', count: (processo.notas || []).length },
    { id: 'movimentacoes', label: '📋 Movimentações', count: (processo.movimentacoes || []).length },
    { id: 'audiencias', label: '📅 Audiências', count: (processo.audiencias || []).length },
    { id: 'partes', label: '👥 Partes', count: (processo.partes || []).length },
    { id: 'arquivos', label: '📎 Arquivos', count: (processo.arquivos || []).length },
    { id: 'consulta', label: '🔗 Consultar' },
    { id: 'info', label: 'ℹ️ Informações' },
  ];

  if (editando) return <ProcessoForm processo={processo} onSave={p => { onUpdate(p); setEditando(false); }} onCancel={() => setEditando(false)} />;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn-ghost" onClick={onBack}>← Voltar</button>
        <div style={{ flex: 1 }} />
        <button className="btn-secondary" onClick={() => setEditando(true)}>✏️ Editar</button>
        <button className="btn-danger" onClick={() => { if (confirm('Excluir processo?')) onDelete(processo.id); }}>🗑️ Excluir</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <Badge label={ts.label} color={ts.color} bg={ts.bg} />
          <Badge label={fs.label || processo.fase} color={fs.color} bg={fs.bg} />
          <Badge label={processo.tribunal} color="#94a3b8" bg="rgba(148,163,184,.1)" />
          {(processo.assuntos || []).map(a => (
            <Badge key={a} label={a} color="#a78bfa" bg="rgba(167,139,250,.1)" />
          ))}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>{processo.numero}</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{processo.parte}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{processo.tramitacao}</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding: '8px 16px', borderRadius: 8, border: aba === a.id ? '1px solid var(--blue)' : '1px solid var(--border)', background: aba === a.id ? 'rgba(59,130,246,.15)' : 'var(--surface)', color: aba === a.id ? '#93c5fd' : 'var(--muted)', fontSize: 13, fontWeight: aba === a.id ? 700 : 400, cursor: 'pointer' }}>
            {a.label}{a.count > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--surface2)', borderRadius: 99, padding: '1px 5px' }}>{a.count}</span>}
          </button>
        ))}
      </div>

      {aba === 'notas' && <TabNotas notas={processo.notas || []} onAdd={addNota} onDel={delNota} onEdit={editNota} autorAtual={autorAtual} />}
      {aba === 'movimentacoes' && <TabMovimentacoes movimentacoes={processo.movimentacoes || []} onAdd={addMovimentacao} onDel={delMovimentacao} />}
      {aba === 'audiencias' && <TabAudiencias audiencias={processo.audiencias || []} onAdd={addAudiencia} onDel={delAudiencia} />}
      {aba === 'partes' && <TabPartes partes={processo.partes || []} onUpdate={ps => onUpdate({ ...processo, partes: ps, updatedAt: now() })} />}
      {aba === 'arquivos' && <TabArquivos arquivos={processo.arquivos || []} onAdd={addArquivo} onDel={delArquivo} processoId={processo.id} />}
      {aba === 'consulta' && <TabConsulta processo={processo} />}
      {aba === 'info' && <TabInfo processo={processo} />}
    </div>
  );
}
