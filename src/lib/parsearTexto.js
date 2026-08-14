import { chamarClaude } from './claude.js';

function get(texto, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = texto.match(new RegExp(esc + '\\s*\\n\\s*(.+)', 'i'));
  return m ? m[1].trim() : '';
}

function parseData(ddmmyyyy) {
  const m = (ddmmyyyy || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function formatarNumeroCNJ(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.length === 20)
    return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16,20)}`;
  return raw;
}

function extrairTribunal(texto) {
  const trt = texto.match(/Tribunal\s+Regional\s+do\s+Trabalho\s+da\s+(\d+)[aª°]?\s+Regi/i);
  if (trt) return `TRT${String(parseInt(trt[1])).padStart(2, '0')}`;

  const tjEstado = {
    'goiás': 'TJGO', 'mato grosso do sul': 'TJMS', 'mato grosso': 'TJMT',
    'são paulo': 'TJSP', 'tocantins': 'TJTO', 'rio de janeiro': 'TJRJ',
    'minas gerais': 'TJMG', 'rio grande do sul': 'TJRS', 'paraná': 'TJPR',
  };
  for (const [estado, sigla] of Object.entries(tjEstado)) {
    if (new RegExp(estado, 'i').test(texto)) return sigla;
  }

  const tjSigla = texto.match(/\b(TJ[A-Z]{2}|TRT\d{2})\b/);
  return tjSigla ? tjSigla[1] : '';
}

function extrairPartes(texto) {
  const partes = [];

  const autorSec = texto.match(/Do\(s\)\s*Autor\(es\)([\s\S]*?)(?=Do\s+Réu|Dos\s+Terceiros|Da\s+Audiência|$)/i)?.[1] || '';
  for (const m of autorSec.matchAll(/NOME DO AUTOR\s*\n(.+)/gi)) {
    const raw = m[1].trim();
    if (/não informado/i.test(raw)) continue;
    partes.push({
      nome: raw.replace(/\s*CPF\s*\d+/i, '').trim(),
      documento: (raw.match(/CPF\s*(\d+)/i) || [])[1] || null,
      polo: 'ativo', tipo_pessoa: 'fisica',
    });
  }

  const reuSec = texto.match(/Do\s+Réu\/Reclamado([\s\S]*?)(?=Dos\s+Terceiros|Da\s+Audiência|$)/i)?.[1] || '';
  for (const m of reuSec.matchAll(/NOME DO RÉU\s*\n(.+)/gi)) {
    const raw = m[1].trim();
    if (/não informado/i.test(raw)) continue;
    partes.push({
      nome: raw.replace(/\s*CNPJ\s*[\d.\/-]+/i, '').trim(),
      documento: (raw.match(/CNPJ\s*([\d.\/-]+)/i) || [])[1] || null,
      polo: 'passivo', tipo_pessoa: 'juridica',
    });
  }

  return partes;
}

function extrairAudiencia(texto) {
  const sec = texto.match(/Da\s+Audiência([\s\S]*?)(?=Da\s+Sessão|Processo\s+Antigo|Log\s+de|$)/i)?.[1] || '';
  if (!sec) return null;

  const data = parseData(get(sec, 'DATA'));
  if (!data) return null;

  const hora = get(sec, 'HORA');
  const tipoRaw = get(sec, 'TIPO');
  const tipo = tipoRaw === 'INICIAL' ? 'Audiência Inicial'
    : tipoRaw === 'INSTRUÇÃO' ? 'Instrução'
    : tipoRaw || 'Audiência';
  const formato = get(sec, 'FORMATO');
  const local = /virtual|digital/i.test(formato) ? 'Videoconferência' : 'Presencial';

  return { data, hora, tipo, local, obs: '' };
}

export async function extrairProcessoComIA(texto) {
  const data = await chamarClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extraia as informações do processo jurídico abaixo e retorne APENAS um JSON válido, sem explicações:

{
  "numero": "número do processo (formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO)",
  "tribunal": "sigla do tribunal (ex: TRT18, TJGO, TJSP)",
  "tramitacao": "vara ou órgão julgador",
  "parte": "nome do autor/reclamante (polo ativo)",
  "fase": "Conhecimento ou Execução ou Arquivado",
  "tipo": "juridico ou administrativo",
  "assuntos": ["assunto1", "assunto2"],
  "valorCausa": valor numérico em reais sem formatação ou null,
  "dataAjuizamento": "YYYY-MM-DD ou vazio",
  "uf": "sigla do estado (ex: GO, SP, MA) ou vazio",
  "instancia": "Primeiro Grau ou Segundo Grau ou vazio",
  "tipoDocumento": "Citação, Intimação ou vazio",
  "audiencia": {
    "data": "YYYY-MM-DD ou vazio",
    "hora": "HH:MM ou vazio",
    "tipo": "tipo da audiência ou vazio",
    "local": "Videoconferência ou Presencial ou vazio"
  },
  "partes": [
    { "nome": "nome", "polo": "ativo ou passivo", "documento": "CPF ou CNPJ ou null", "tipo_pessoa": "fisica ou juridica" }
  ],
  "andamentos": [
    { "data": "YYYY-MM-DD", "hora": "HH:MM", "evento": "descrição do evento", "origem": "origem/sistema" }
  ]
}

Texto:
${texto}`,
    }],
  });
  const json = JSON.parse(data.content[0].text.match(/\{[\s\S]*\}/)[0]);

  const aud = json.audiencia?.data ? [{
    data: json.audiencia.data,
    hora: json.audiencia.hora || '',
    tipo: json.audiencia.tipo || 'Audiência',
    local: json.audiencia.local || '',
    obs: '',
  }] : [];

  return {
    numero: json.numero || '',
    tipo: json.tipo || 'juridico',
    fase: json.fase || 'Conhecimento',
    parte: json.parte || '',
    tribunal: json.tribunal || '',
    tramitacao: json.tramitacao || '',
    assuntos: Array.isArray(json.assuntos) ? json.assuntos : [],
    valorCausa: json.valorCausa ? parseFloat(json.valorCausa) : null,
    dataAjuizamento: json.dataAjuizamento || null,
    uf: json.uf || null,
    instancia: json.instancia || null,
    tipoDocumento: json.tipoDocumento || null,
    partes: Array.isArray(json.partes) ? json.partes : [],
    audiencias: aud,
    notas: [],
    movimentacoes: (json.andamentos || [])
      .filter(a => a.evento && !/não informado/i.test(a.evento))
      .map(a => ({ data: a.data || null, hora: a.hora || '', evento: a.evento, origem: a.origem || 'Sistema' })),
    arquivos: [],
  };
}

function extrairLog(texto) {
  const sec = texto.match(/Log\s+de\s+Auditoria([\s\S]*)$/i)?.[1] || '';
  if (!sec.trim()) return [];

  const notas = [];
  const blocos = sec.split(/(?=\bDATA\b\s*\n\d{2}\/\d{2}\/\d{4})/);

  for (const bloco of blocos) {
    if (!bloco.trim()) continue;
    const data = parseData(get(bloco, 'DATA'));
    if (!data) continue;
    const hora = get(bloco, 'HORA');
    const eventoM = bloco.match(/EVENTO[\/|]?A[CÇ][AÃ]O\s*\n\s*(.+)/i);
    const evento = eventoM ? eventoM[1].trim() : '';
    const origem = get(bloco, 'ORIGEM');
    if (!evento || /não informado/i.test(evento)) continue;

    notas.push({ data, hora, evento, origem: origem || 'Sistema' });
  }

  return notas;
}

export function parsearTextoEstruturado(texto) {
  const numero = formatarNumeroCNJ(get(texto, 'NÚMERO DO PROCESSO'));
  const tribunal = extrairTribunal(texto);
  const vara = get(texto, 'VARA JUDICIAL') || get(texto, 'ÓRGÃO JULGADOR');
  const assuntosStr = get(texto, 'ASSUNTO');
  const assuntos = assuntosStr && !/não informado/i.test(assuntosStr)
    ? assuntosStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  const valorStr = get(texto, 'VALOR DA CAUSA').replace(/[R$\s.]/g, '').replace(',', '.');
  const valorCausa = valorStr ? parseFloat(valorStr) : null;
  const partes = extrairPartes(texto);
  const aud = extrairAudiencia(texto);

  const tipo = /TRT\d/i.test(tribunal) ? 'juridico' : 'juridico';
  const parte = partes.find(p => p.polo === 'ativo')?.nome || '';
  const dataAjuizamento = parseData(get(texto, 'DATA DO AJUIZAMENTO'));
  const uf = (() => { const v = get(texto, 'UF'); return v && !/não informado/i.test(v) ? v.trim().toUpperCase().slice(0, 2) : null; })();
  const instancia = (() => { const v = get(texto, 'INSTÂNCIA'); return v && !/não informado/i.test(v) ? v.trim() : null; })();
  const tipoDocumento = (() => { const v = get(texto, 'TIPO DE DOCUMENTO'); return v && !/não informado/i.test(v) ? v.trim() : null; })();

  // Campos extras → movimentações automáticas
  const movimentacoesExtra = [];
  const hoje = new Date().toISOString().slice(0, 10);

  const tipoDoc = get(texto, 'TIPO DE DOCUMENTO');
  const dataComunicacao = parseData(get(texto, 'DATA DA COMUNICAÇÃO').slice(0, 10).split(' ')[0]);
  if (tipoDoc && !/não informado/i.test(tipoDoc)) {
    movimentacoesExtra.push({
      data: dataComunicacao || hoje,
      hora: get(texto, 'DATA DA COMUNICAÇÃO').slice(11, 16) || '',
      evento: `📬 ${tipoDoc} recebida`,
      origem: 'PJUD',
    });
  }

  const dataCiencia = parseData(get(texto, 'DATA FINAL PARA CIÊNCIA'));
  if (dataCiencia) {
    movimentacoesExtra.push({
      data: dataCiencia,
      hora: '',
      evento: `⏰ Prazo final para ciência`,
      origem: 'PJUD',
    });
  }

  const registrouCiencia = get(texto, 'REGISTROU CIÊNCIA EM');
  if (registrouCiencia && !/não informado/i.test(registrouCiencia)) {
    const [dataPart, horaPart] = registrouCiencia.split(' ');
    movimentacoesExtra.push({
      data: parseData(dataPart) || hoje,
      hora: horaPart || '',
      evento: `✅ Ciência registrada`,
      origem: 'PJUD',
    });
  }

  if (dataAjuizamento) {
    movimentacoesExtra.push({
      data: dataAjuizamento,
      hora: '',
      evento: `📁 Ajuizamento da ação`,
      origem: 'PJUD',
    });
  }

  // Classe → adiciona aos assuntos se não estiver
  const classe = get(texto, 'CLASSE');
  if (classe && !/não informado/i.test(classe) && !assuntos.includes(classe)) {
    assuntos.unshift(classe);
  }

  return {
    numero,
    tipo,
    fase: 'Conhecimento',
    parte,
    tribunal,
    tramitacao: vara,
    assuntos,
    valorCausa,
    dataAjuizamento,
    uf,
    instancia,
    tipoDocumento,
    partes,
    audiencias: aud ? [aud] : [],
    notas: [],
    movimentacoes: [...movimentacoesExtra, ...extrairLog(texto)],
    arquivos: [],
  };
}
