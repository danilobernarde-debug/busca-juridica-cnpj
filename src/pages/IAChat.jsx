import { useState, useRef, useEffect } from 'react';
import { chamarClaude } from '../lib/claude.js';

export default function IAChat({ processos }) {
  const [msgs, setMsgs] = useState([
    { role: 'assistant', content: 'Olá! Sou seu assistente jurídico. Posso analisar seus processos, identificar prazos críticos, resumir situações e responder perguntas sobre seu portfólio jurídico. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  const buildContext = () => {
    const ativos = processos.filter(p => p.fase !== 'Arquivado');
    const hoje = new Date().toISOString().slice(0, 10);
    const proxAuds = processos.flatMap(p =>
      (p.audiencias || []).filter(a => a.data >= hoje).map(a => `${a.data} - ${a.tipo} (${p.numero} / ${p.parte})`)
    ).slice(0, 10);

    const lista = ativos.map(p => {
      const notas = (p.notas || []).slice(-3).map(n => n.texto).join('; ');
      return `[${p.tipo.toUpperCase()}] ${p.numero} | Fase: ${p.fase} | Parte: ${p.parte} | ${p.tribunal} | ${p.tramitacao}${notas ? ` | Notas: ${notas}` : ''}`;
    }).join('\n');

    return `Você é o assistente jurídico interno da empresa DB Machado LTDA / Rede Forte Construções.

PROCESSOS ATIVOS (${ativos.length} de ${processos.length} total):
${lista}

PRÓXIMAS AUDIÊNCIAS:
${proxAuds.length ? proxAuds.join('\n') : 'Nenhuma audiência agendada'}

Responda em português, de forma objetiva e direta. Destaque urgências e prazos críticos quando relevante.`;
  };

  const enviar = async () => {
    if (!input.trim() || loading) return;

    const novaMsg = { role: 'user', content: input.trim() };
    setMsgs(m => [...m, novaMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = msgs.filter(m => m.role !== 'system').slice(-8);
      const data = await chamarClaude({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: buildContext(),
        messages: [...history, novaMsg],
      });
      setMsgs(m => [...m, { role: 'assistant', content: data.content[0].text }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: `❌ Erro: ${e.message}` }]);
    } finally { setLoading(false); }
  };

  const sugestoes = ['Quais processos têm prazo urgente?', 'Resumo das execuções em andamento', 'Processos com descumprimento de acordo', 'Situação dos processos no TRT10', 'Análise de risco geral'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 28, gap: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 18 }}>🤖 IA Jurídica</div>
      <div ref={containerRef} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: 12, background: m.role === 'user' ? 'linear-gradient(135deg,var(--blue),#1d4ed8)' : 'var(--surface2)', color: 'var(--text)', fontSize: 13, lineHeight: 1.6, border: m.role === 'assistant' ? '1px solid var(--border)' : 'none', whiteSpace: 'pre-wrap' }}>
              {m.role === 'assistant' && <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700, marginBottom: 4 }}>⚖️ ASSISTENTE JURÍDICO</div>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex' }}>
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13 }}>Analisando... ⏳</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {sugestoes.map(s => (
          <button key={s} onClick={() => setInput(s)} style={{ padding: '5px 12px', borderRadius: 99, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>{s}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()} placeholder="Pergunte sobre processos, prazos, riscos..." style={{ flex: 1 }} />
        <button className="btn-primary" onClick={enviar} disabled={loading || !input.trim()}>Enviar →</button>
      </div>
    </div>
  );
}
