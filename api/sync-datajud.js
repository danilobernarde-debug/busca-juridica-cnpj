// ─── SINCRONIZAÇÃO AUTOMÁTICA COM O DATAJUD (CNJ) ──────────────────────────
// Disparada 1x/dia pelo Vercel Cron (ver vercel.json). Para cada processo
// jurídico não arquivado, consulta a API Pública do DataJud, insere
// movimentações novas em `jud_movimentacoes` e cria um registro em
// `jud_notificacoes` (exibido no sininho do sistema).
//
// Cobertura: apenas TRT (Justiça do Trabalho) e TJ (Justiça Estadual), que são
// os segmentos cujo padrão de endpoint do DataJud foi confirmado na
// documentação oficial (datajud-wiki.cnj.jus.br). TRF/TST/STJ/STF ficam de
// fora por ora — o processo é apenas ignorado (não gera erro).
//
// Requer variáveis de ambiente (configurar no painel da Vercel, não no .env
// do frontend): SUPABASE_URL, SUPABASE_SERVICE_KEY. Opcionais: DATAJUD_API_KEY
// (sobrescreve a chave pública padrão) e CRON_SECRET (protege o endpoint).
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br';
// Chave pública oficial do DataJud (datajud-wiki.cnj.jus.br/api-publica/acesso) — compartilhada por todos, não é secreta.
const DATAJUD_KEY_PADRAO = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

function aliasDoTribunal(tribunalRaw) {
  const tribunal = (tribunalRaw || '').trim().toUpperCase();
  const trt = tribunal.match(/^TRT ?0?(\d{1,2})$/);
  if (trt) return `trt${parseInt(trt[1], 10)}`;
  const tj = tribunal.match(/^TJ ?([A-Z]{2})$/);
  if (tj) return `tj${tj[1].toLowerCase()}`;
  return null;
}

async function consultarDataJud(alias, numeroLimpo, apiKey) {
  const resp = await fetch(`${DATAJUD_BASE}/api_publica_${alias}/_search`, {
    method: 'POST',
    headers: { Authorization: `APIKey ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { match: { numeroProcesso: numeroLimpo } } }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  return json?.hits?.hits?.[0]?._source || null;
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configuradas' });
  }
  const apiKey = process.env.DATAJUD_API_KEY || DATAJUD_KEY_PADRAO;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: processos, error } = await supabase
    .from('jud_processos')
    .select('id, numero, tribunal')
    .eq('tipo', 'juridico')
    .neq('fase', 'Arquivado');
  if (error) return res.status(500).json({ error: error.message });

  const resultado = { verificados: 0, comNovidade: 0, ignorados: 0, erros: [] };

  for (const p of processos) {
    const alias = aliasDoTribunal(p.tribunal);
    const numeroLimpo = (p.numero || '').replace(/\D/g, '');
    if (!alias || numeroLimpo.length !== 20) { resultado.ignorados++; continue; }

    resultado.verificados++;
    try {
      const fonte = await consultarDataJud(alias, numeroLimpo, apiKey);
      const movimentos = fonte?.movimentos || [];
      if (!movimentos.length) continue;

      const { data: existentes } = await supabase
        .from('jud_movimentacoes')
        .select('data, hora, evento')
        .eq('processo_id', p.id);
      const chaveExistente = new Set((existentes || []).map(m => `${m.data}|${m.hora}|${m.evento}`));

      const novas = [];
      for (const mv of movimentos) {
        const dt = mv.dataHora ? new Date(mv.dataHora) : null;
        const data = dt ? dt.toISOString().slice(0, 10) : null;
        const hora = dt ? dt.toISOString().slice(11, 16) : null;
        const evento = mv.nome || 'Movimentação';
        const chave = `${data}|${hora}|${evento}`;
        if (chaveExistente.has(chave)) continue;
        novas.push({ processo_id: p.id, data, hora, evento, origem: 'DataJud (CNJ)' });
      }
      if (!novas.length) continue;

      const { data: inseridas, error: insErr } = await supabase
        .from('jud_movimentacoes').insert(novas).select('id, processo_id, evento');
      if (insErr) { resultado.erros.push(`${p.numero}: ${insErr.message}`); continue; }

      resultado.comNovidade++;
      await supabase.from('jud_notificacoes').insert(
        inseridas.map(m => ({
          processo_id: m.processo_id,
          movimentacao_id: m.id,
          mensagem: `Nova movimentação em ${p.numero}: ${m.evento}`,
        }))
      );
    } catch (e) {
      resultado.erros.push(`${p.numero}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 250)); // evita rate limit do DataJud
  }

  return res.status(200).json(resultado);
}
