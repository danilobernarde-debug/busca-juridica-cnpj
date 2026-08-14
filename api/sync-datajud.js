// ─── SINCRONIZAÇÃO AUTOMÁTICA COM O DATAJUD (CNJ) ──────────────────────────
// Disparada 1x/dia pelo Vercel Cron (ver vercel.json). Para cada processo
// jurídico não arquivado, consulta a API Pública do DataJud, insere
// movimentações novas em `jud_movimentacoes` e cria UMA notificação por
// processo (mesmo que tragam várias movimentações de uma vez) em
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

// Hobby plan da Vercel permite até 300s — deixamos folga porque o volume de
// processos pode crescer (hoje já passa de 200 processos ativos TRT/TJ).
export const config = { maxDuration: 280 };
const CONCORRENCIA = 6; // requisições simultâneas ao DataJud

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

function fmtDataBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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

async function processarProcesso(p, supabase, apiKey, resultado) {
  const alias = aliasDoTribunal(p.tribunal);
  const numeroLimpo = (p.numero || '').replace(/\D/g, '');
  if (!alias || numeroLimpo.length !== 20) { resultado.ignorados++; return; }

  resultado.verificados++;
  try {
    const fonte = await consultarDataJud(alias, numeroLimpo, apiKey);
    const movimentos = fonte?.movimentos || [];
    if (!movimentos.length) return;

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
    if (!novas.length) return;

    const { data: inseridas, error: insErr } = await supabase
      .from('jud_movimentacoes').insert(novas).select('id, processo_id, data, hora, evento');
    if (insErr) { resultado.erros.push(`${p.numero}: ${insErr.message}`); return; }

    resultado.comNovidade++;

    // Uma notificação por processo (não por movimentação) — um processo pode
    // trazer dezenas/centenas de itens numa sincronização (ex: primeira vez).
    const maisRecente = [...inseridas].sort((a, b) => `${b.data}${b.hora}`.localeCompare(`${a.data}${a.hora}`))[0];
    const mensagem = inseridas.length === 1
      ? `Nova movimentação em ${p.numero} (${fmtDataBR(maisRecente.data)}): ${maisRecente.evento}`
      : `${inseridas.length} movimentações novas em ${p.numero} — mais recente (${fmtDataBR(maisRecente.data)}): ${maisRecente.evento}`;

    await supabase.from('jud_notificacoes').insert([{
      processo_id: p.id,
      movimentacao_id: maisRecente.id,
      mensagem,
    }]);
  } catch (e) {
    resultado.erros.push(`${p.numero}: ${e.message}`);
  }
}

// Processa a fila com um pool de workers concorrentes, em vez de sequencial
// com pausa — com 200+ processos, sequencial estourava o tempo máximo da function.
async function processarFila(processos, supabase, apiKey, resultado) {
  let cursor = 0;
  async function worker() {
    while (cursor < processos.length) {
      const p = processos[cursor++];
      await processarProcesso(p, supabase, apiKey, resultado);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, processos.length) }, worker));
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
  await processarFila(processos, supabase, apiKey, resultado);

  return res.status(200).json(resultado);
}
