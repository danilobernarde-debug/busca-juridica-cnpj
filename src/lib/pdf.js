// ─── PDF ─────────────────────────────────────────────────────────────────────
import * as pdfjsLib from 'pdfjs-dist';
import { uid, now, fmtData } from './utils.js';
import { comprimirImagem } from './compress.js';

// ─── PDF.JS WORKER ───────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href;

// ─── ASSUNTOS REGEX ───────────────────────────────────────────────────────────
export const ASSUNTOS_REGEX = [
  [/rescis[aã]o\s+indireta/i,                         'Rescisão Indireta'],
  [/horas?\s+extras?/i,                               'Horas Extras'],
  [/adicional\s+(?:de\s+)?insalubridade/i,            'Insalubridade'],
  [/adicional\s+(?:de\s+)?periculosidade/i,           'Periculosidade'],
  [/\bFGTS\b/i,                                       'FGTS'],
  [/dano\s+moral/i,                                   'Dano Moral'],
  [/dano\s+material/i,                                'Dano Material'],
  [/acidente\s+(?:de\s+)?trabalho/i,                  'Acidente de Trabalho'],
  [/acidente\s+(?:de\s+)?tr[âa]nsito/i,              'Acidente de Trânsito'],
  [/aviso[\s-]+pr[eé]vio/i,                           'Aviso Prévio'],
  [/verbas?\s+rescis[oó]rias?/i,                      'Verbas Rescisórias'],
  [/ass[eé]dio\s+moral/i,                             'Assédio Moral'],
  [/ass[eé]dio\s+sexual/i,                            'Assédio Sexual'],
  [/execu[çc][aã]o\s+(?:de\s+)?(?:título|sentença)/i,'Execução'],
  [/cumprimento\s+de\s+senten[çc]a/i,                'Cumprimento de Sentença'],
  [/penhora/i,                                        'Penhora'],
  [/busca\s+e\s+apreens[aã]o/i,                       'Busca e Apreensão'],
  [/monit[oó]ria/i,                                   'Ação Monitória'],
  [/despejo/i,                                        'Ação de Despejo'],
  [/cobran[çc]a/i,                                    'Cobrança'],
  [/indeniza[çc][aã]o/i,                              'Indenização'],
  [/dissídio/i,                                       'Dissídio'],
  [/equipara[çc][aã]o\s+salarial/i,                  'Equiparação Salarial'],
  [/intervalo\s+intrajornada/i,                       'Intervalo Intrajornada'],
  [/horas?\s+(?:de\s+)?sobreaviso/i,                  'Sobreaviso'],
];

// ─── EXTRAÇÃO DE TEXTO DO PDF ─────────────────────────────────────────────────
export async function extrairTextoPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let texto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map(item => item.str).join(' ') + ' ';
  }
  return { texto, numPages: pdf.numPages, escaneado: texto.replace(/\s/g, '').length < 120 };
}

// Renderiza páginas do PDF como imagens base64 (para PDFs escaneados)
export async function pdfParaImagens(file, maxPaginas = 3) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const paginas = Math.min(pdf.numPages, maxPaginas);
  const imagens = [];
  for (let i = 1; i <= paginas; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    imagens.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
  }
  return imagens;
}

const PROMPT_EXTRACAO = `Este é um documento do DJE (Diário da Justiça Eletrônico) brasileiro. Extraia as seguintes informações em JSON:
{
  "numero": "número do processo no formato NNNNNNN-DD.AAAA.J.TT.OOOO",
  "tribunal": "sigla do tribunal (ex: TRT18, TJGO, TRT16)",
  "vara": "vara ou unidade judiciária",
  "uf": "sigla do estado (ex: GO, SP, MA) ou vazio",
  "instancia": "Primeiro Grau ou Segundo Grau ou vazio",
  "autor": "nome do autor/reclamante (polo ativo, quem move a ação)",
  "reclamado": "nome do réu/reclamado (polo passivo)",
  "assuntos": ["lista dos assuntos/pedidos do processo, ex: Rescisão Indireta, Horas Extras, FGTS, Dano Moral, Cobrança, etc."],
  "valorCausa": número em reais sem formatação (ex: 53130.00) ou null,
  "tipoDocumento": "Citação, Intimação ou vazio",
  "dataAjuizamento": "DD/MM/AAAA ou vazio",
  "dataAudiencia": "DD/MM/AAAA ou vazio",
  "horaAudiencia": "HH:MM ou vazio",
  "tipoAudiencia": "tipo da audiência",
  "local": "link de videoconferência ou Presencial"
}
Responda APENAS o JSON, sem explicações.`;

// Chama Claude com blocos de conteúdo (imagens e/ou texto) e parseia o JSON de extração
async function _chamarClaudeExtracao(content, claudeKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      messages: [{ role: 'user', content }]
    })
  });
  if (!res.ok) throw new Error('Erro na API Claude');
  const data = await res.json();
  const json = JSON.parse(data.content[0].text.match(/\{[\s\S]*\}/)[0]);
  let data_ = '', hora = '';
  if (json.dataAudiencia) {
    const [d, m, y] = json.dataAudiencia.split('/');
    data_ = `${y}-${m}-${d}`;
    hora = json.horaAudiencia || '';
  }
  let dataAjuizamento = '';
  if (json.dataAjuizamento) {
    const [da, ma, ya] = json.dataAjuizamento.split('/');
    if (ya) dataAjuizamento = `${ya}-${ma}-${da}`;
  }

  return {
    num: json.numero || '',
    tribunal: json.tribunal || '',
    vara: json.vara || '',
    uf: json.uf || '',
    instancia: json.instancia || '',
    tipoDocumento: json.tipoDocumento || '',
    autor: json.autor || '',
    reclamado: json.reclamado || '',
    assuntos: Array.isArray(json.assuntos) ? json.assuntos : [],
    valorCausa: json.valorCausa ? parseFloat(json.valorCausa) : null,
    dataAjuizamento,
    data: data_,
    hora,
    tipoAud: json.tipoAudiencia || 'Audiência',
    local: json.local || '',
  };
}

// Usa Claude Vision com array de { data: base64, mediaType }
async function _chamarClaudeVision(imagens, claudeKey) {
  return _chamarClaudeExtracao([
    ...imagens.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } })),
    { type: 'text', text: PROMPT_EXTRACAO },
  ], claudeKey);
}

// Usa Claude para reextrair dados a partir do texto do documento (quando o parser por regex falhou)
export async function extrairComIATexto(texto, claudeKey) {
  return _chamarClaudeExtracao([
    { type: 'text', text: `${PROMPT_EXTRACAO}\n\nTexto do documento:\n${texto.slice(0, 15000)}` },
  ], claudeKey);
}

// Usa Claude Vision para extrair dados de PDF escaneado
export async function extrairComIA(file, claudeKey) {
  const imgs = await pdfParaImagens(file);
  return _chamarClaudeVision(imgs.map(data => ({ data, mediaType: 'image/jpeg' })), claudeKey);
}

const FORMATOS_SUPORTADOS_CLAUDE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Usa Claude Vision para extrair dados de uma imagem diretamente
// Comprime antes de enviar (max 1920px, JPEG 75%) para garantir compatibilidade
export async function extrairComIAImagem(file, claudeKey) {
  // Valida formato antes de tentar (TIFF, BMP etc. não são suportados pelo Claude Vision)
  if (!FORMATOS_SUPORTADOS_CLAUDE.includes(file.type)) {
    const ext = file.name.split('.').pop().toUpperCase();
    throw new Error(`Formato ${ext} não suportado. Use JPEG, PNG, WEBP ou GIF.`);
  }

  const comprimido = await comprimirImagem(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(',')[1];
        const resultado = await _chamarClaudeVision([{ data: base64, mediaType: 'image/jpeg' }], claudeKey);
        resolve(resultado);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'));
    reader.readAsDataURL(comprimido);
  });
}


// ─── PARSER DE DJE ───────────────────────────────────────────────────────────
export function parsearDJE(texto) {
  const t = texto.replace(/\s+/g, ' ');

  // Número do processo (formato CNJ)
  const num = (t.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/) || [])[1] || '';

  // Tribunal TRT
  const trtM = t.match(/TRABALHO DA\s+(\d+)[ªa°]?\s*REGI/i);
  const tribunal = trtM ? `TRT${String(parseInt(trtM[1])).padStart(2, '0')}` : '';

  // Vara do trabalho
  const varaM = t.match(/((?:\d+[ªa°]?\s+)?(?:VARA|POSTO)\s+(?:AVANÇADO\s+DE\s+\w+|DO\s+TRABALHO[^,\.]{2,40}?))\s*(?:-\s*[A-Z]{2})?/i);
  const vara = varaM ? varaM[0].replace(/\s+/g, ' ').trim().slice(0, 60) : '';

  // Autor/Reclamante — polo ativo
  const autorM = t.match(/(?:AUTOR|RECLAMANTE):\s*([A-ZÁÊÇÕÃÂÍÓÚ][^\|]{3,60}?)(?=\s+R[EÉ]U|\s+RECLAMADO|\s+DEST)/i)
               || t.match(/(?:AUTOR|RECLAMANTE):\s*([A-ZÁÊÇÕÃÂÍÓÚ][^\n\r]{3,60})/i);
  const autor = autorM ? autorM[1].replace(/\s+/g, ' ').trim().split(/\s{2,}/)[0] : '';

  // Réu/Reclamado — polo passivo
  const reclamadoM = t.match(/(?:R[EÉ]U|RECLAMAD[OA]):\s*([A-ZÁÊÇÕÃÂÍÓÚ][^\|]{3,80}?)(?=\s+(?:AUTOR|RECLAMANTE|CPF|CNPJ|\|))/i)
                   || t.match(/(?:R[EÉ]U|RECLAMAD[OA]):\s*([A-ZÁÊÇÕÃÂÍÓÚ][^\n\r]{3,80})/i);
  const reclamado = reclamadoM ? reclamadoM[1].replace(/\s+/g, ' ').trim().split(/\s{2,}/)[0] : '';

  // Assuntos detectados por regex
  const assuntos = ASSUNTOS_REGEX.filter(([re]) => re.test(t)).map(([, label]) => label);

  // Data — múltiplos formatos
  const dataM = t.match(/(\d{2}\/\d{2}\/\d{4})[,\s]+(?:às\s+|às)?(\d{2})(?:h|:)(\d{2})/i)
             || t.match(/dia\s+(\d{2}\/\d{2}\/\d{4})[,\s]+(\d{2}):(\d{2})/i);
  let data = '', hora = '';
  if (dataM) {
    const [d, m, y] = dataM[1].split('/');
    data = `${y}-${m}-${d}`;
    hora = `${dataM[2]}:${dataM[3]}`;
  }

  // Link da audiência
  const linkM = t.match(/(https?:\/\/[^\s"'<>]+(?:zoom|meet|teams)[^\s"'<>]*)/i);
  const link = linkM ? linkM[1] : '';

  // Tipo e local da audiência
  const tipoAud = /AUDI[EÊ]NCIA INICIAL/i.test(t) ? 'Audiência Inicial' :
                  /CONCILIA[CÇ]/i.test(t) ? 'Conciliação' :
                  /INSTRU[CÇ][AÃ]O/i.test(t) ? 'Instrução' : 'Audiência';
  const local = /VIRTUAL|ZOOM|videoconfer|telepresencial|100% DIGITAL/i.test(t)
    ? (link || 'Videoconferência')
    : /PRESENCIAL/i.test(t) ? 'Presencial' : link || '';

  return { num, tribunal, vara: vara || '', autor, reclamado, assuntos, data, hora, tipoAud, local, link };
}

// ─── COMPRESSÃO DO ARQUIVO ────────────────────────────────────────────────────
export async function comprimirArquivo(arrayBuffer) {
  try {
    if (!window.CompressionStream) return null;
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(new Uint8Array(arrayBuffer));
    writer.close();
    const chunks = [];
    const reader = cs.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((a, b) => a + b.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach(c => { result.set(c, offset); offset += c.length; });
    return result;
  } catch { return null; }
}

export function uint8ToBase64(u8) {
  let bin = '';
  u8.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

// ─── LEITOR DE TXT COM DETECÇÃO DE ENCODING ──────────────────────────────────
async function lerTextoTXT(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  // Se tiver muitos caracteres inválidos, tenta windows-1252
  if ((utf8.match(/�/g) || []).length > 3) {
    return new TextDecoder('windows-1252').decode(buffer);
  }
  return utf8;
}

// ─── PARSER TXT ───────────────────────────────────────────────────────────────
export function parsearTXT(texto) {
  const t = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let num = '', tribunal = '', vara = '', autor = '', reclamado = '',
      data = '', hora = '', tipoAud = 'Audiência', local = '';

  // Número do processo (formato PJe: 20 dígitos)
  const numRaw = (t.match(/N[ÚUu]MERO\s+DO\s+PROCESSO\s*\n\s*([0-9]{20})/i) || [])[1] || '';
  if (numRaw) {
    num = `${numRaw.slice(0,7)}-${numRaw.slice(7,9)}.${numRaw.slice(9,13)}.${numRaw.slice(13,14)}.${numRaw.slice(14,16)}.${numRaw.slice(16,20)}`;
  } else {
    num = (t.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/) || [])[1] || '';
  }

  // Tribunal
  const trtM = t.match(/Tribunal\s+Regional\s+do\s+Trabalho\s+da\s+(\d+)/i)
             || t.match(/TRT\s+da?\s+(\d+)/i);
  if (trtM) tribunal = `TRT${String(parseInt(trtM[1])).padStart(2,'0')}`;

  // Vara / Órgão Julgador
  const varaM = t.match(/[ÓOo]RG[ÃAa]O\s+JULGADOR\s*\n\s*([^\n]{3,80})/i)
              || t.match(/[ÓOo]rg[ãa]o\s+Julgador:\s*([^\n]{3,80})/i);
  if (varaM) vara = varaM[1].trim();

  // Autor (formato PJe)
  const autorM = t.match(/NOME\s+DO\s+AUTOR\s*\n\s*([A-ZÁÊÇÕÃÂÍÓÚÀÈÌ][^\n]{3,80})/i);
  if (autorM) autor = autorM[1].replace(/\s+CPF\s+\d+.*/i, '').trim();
  // Autor (formato simples: personAutor)
  if (!autor) {
    const a1 = t.match(/person[^\n]*[Aa]utor[^\n]*\n\s*([A-ZÁÊÇÕÃÂÍÓÚÀÈÌ][^\n]{3,80})/i);
    if (a1) autor = a1[1].trim();
  }

  // Réu/Reclamado (pega todos os réus, preferindo D.B. Machado)
  const reusM = [...t.matchAll(/NOME\s+DO\s+R[EÉe]\w+\s*\n\s*([A-ZÁÊÇÕÃÂÍÓÚÀÈÌ][^\n]{3,80})/gi)];
  if (reusM.length > 0) {
    const db = reusM.find(m => /machado/i.test(m[1]));
    reclamado = (db || reusM[0])[1].replace(/\s+CNPJ\s+\d+.*/i, '').trim();
  }
  // Réu (formato simples: personRéu)
  if (!reclamado) {
    const r1 = t.match(/person[^\n]*[Rr][eé]u[^\n]*\n\s*([A-ZÁÊÇÕÃÂÍÓÚÀÈÌ][^\n]{3,80})/i);
    if (r1) reclamado = r1[1].trim();
  }

  // Assuntos (campo ASSUNTO do PJe)
  const assuntoRaw = (t.match(/^ASSUNTO\s*\n\s*([^\n]{3,300})/im) || [])[1] || '';
  const assuntosTexto = assuntoRaw
    ? assuntoRaw.split(/[,;]/).map(a => a.trim()).filter(a => a && !/n[ãa]o\s+inform/i.test(a))
    : [];
  const assuntosRegex = ASSUNTOS_REGEX.filter(([re]) => re.test(t)).map(([, label]) => label);
  const assuntos = [...new Set([...assuntosTexto, ...assuntosRegex])];

  // Valor da causa
  const valorM = (t.match(/VALOR\s+DA\s+CAUSA\s*\n\s*R\$\s*([\d.,]+)/i) || [])[1] || '';
  const valorCausa = valorM ? parseFloat(valorM.replace(/\./g,'').replace(',','.')) : null;

  // Data da audiência — seção "Da Audiência"
  const secAud = t.indexOf('Da Audi');
  if (secAud >= 0) {
    const trecho = t.slice(secAud, secAud + 500);
    const dataM = trecho.match(/DATA\s*\n\s*(\d{2}\/\d{2}\/\d{4})/i)
                || trecho.match(/DATA\s*\n\s*(\d{4}-\d{2}-\d{2})/i);
    if (dataM) {
      const raw = dataM[1];
      data = raw.includes('/') ? (() => { const [d,m,y]=raw.split('/'); return `${y}-${m}-${d}`; })() : raw;
    }
    const horaM = trecho.match(/HORA\s*\n\s*(\d{2}:\d{2})/i);
    if (horaM) hora = horaM[1];
    const tipoM = trecho.match(/TIPO\s*\n\s*(INICIAL|INSTRU[ÇC][ÃA]O|CONCILIA[ÇC][ÃA]O)/i);
    if (tipoM) {
      const tp = tipoM[1].toUpperCase();
      tipoAud = /INICIAL/.test(tp) ? 'Audiência Inicial' : /INSTRU/.test(tp) ? 'Instrução' : 'Conciliação';
    }
    const fmtM = trecho.match(/FORMATO\s*\n\s*(VIRTUAL|PRESENCIAL)/i);
    if (fmtM) local = /VIRTUAL/i.test(fmtM[1]) ? 'Videoconferência' : 'Presencial';
  }
  // Formato simples: "Data da audiência: 2026-03-09"
  if (!data) {
    const d1 = t.match(/Data\s+da\s+audi[eê]ncia:\s*(\d{4}-\d{2}-\d{2})/i)
             || t.match(/Data\s+da\s+audi[eê]ncia:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (d1) {
      const raw = d1[1];
      data = raw.includes('/') ? (() => { const [d,m,y]=raw.split('/'); return `${y}-${m}-${d}`; })() : raw;
    }
    const f1 = t.match(/Formato\s+da\s+audi[eê]ncia:\s*(VIRTUAL|PRESENCIAL)/i);
    if (f1) local = /VIRTUAL/i.test(f1[1]) ? 'Videoconferência' : 'Presencial';
  }

  return { num, tribunal, vara, autor, reclamado, assuntos, data, hora, tipoAud, local, link: '', valorCausa };
}

// ─── HELPER: processa um único arquivo e retorna { tipo, processo } ──────────
export async function processarUmArquivo(file, processos, claudeKey) {
  const isTXT = file.name.toLowerCase().endsWith('.txt');
  const isImage = file.type.startsWith('image/');

  let dados, arq, textoExtraido = '';

  if (isTXT) {
    const texto = await lerTextoTXT(file);
    dados = parsearTXT(texto);
    arq = null;
    textoExtraido = texto;
  } else if (isImage) {
    if (!claudeKey) throw new Error('SEMCHAVE');
    dados = await extrairComIAImagem(file, claudeKey);
    arq = null;
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const { texto, escaneado } = await extrairTextoPDF(file);
    textoExtraido = texto;
    if (!escaneado) {
      dados = parsearDJE(texto);
    } else {
      if (!claudeKey) throw new Error('SEMCHAVE');
      dados = await extrairComIA(file, claudeKey);
    }
    const comprimido = await comprimirArquivo(arrayBuffer);
    const base64 = comprimido
      ? 'data:application/gzip;base64,' + uint8ToBase64(comprimido)
      : 'data:application/pdf;base64,' + uint8ToBase64(new Uint8Array(arrayBuffer));
    arq = {
      id: uid(), nome: file.name,
      tipo: comprimido ? 'application/gzip' : 'application/pdf',
      tamanho: file.size, tamanhoComprimido: comprimido ? comprimido.length : file.size,
      base64, url: null, addedAt: now(),
    };
  }

  const aud = dados.data ? [{
    id: uid(), data: dados.data, hora: dados.hora,
    tipo: dados.tipoAud, local: dados.local, obs: '',
  }] : [];

  const existente = dados.num && processos.find(p =>
    p.numero.replace(/[\s.\-\/]/g, '') === dados.num.replace(/[\s.\-\/]/g, '')
  );

  const partesNovas = [];
  if (dados.autor)     partesNovas.push({ id: uid(), nome: dados.autor,     documento: null, polo: 'ativo',   tipo_pessoa: 'fisica' });
  if (dados.reclamado) partesNovas.push({ id: uid(), nome: dados.reclamado, documento: null, polo: 'passivo', tipo_pessoa: 'juridica' });

  if (existente) {
    const partesExistentes = existente.partes || [];
    const nomesExistentes = new Set(partesExistentes.map(p => p.nome));
    const partesAdicionar = partesNovas.filter(p => !nomesExistentes.has(p.nome));
    const assuntosAtuais = existente.assuntos || [];
    const assuntosNovos = (dados.assuntos || []).filter(a => !assuntosAtuais.includes(a));
    const atualizado = {
      ...existente,
      audiencias: [...(existente.audiencias || []), ...aud],
      arquivos:   arq ? [...(existente.arquivos || []), arq] : (existente.arquivos || []),
      notas: [...(existente.notas || []), {
        id: uid(),
        texto: `Notificação recebida${dados.data ? ` — Audiência ${dados.tipoAud} em ${fmtData(dados.data)}${dados.hora ? ' às ' + dados.hora : ''}` : ''}`,
        autor: 'Importado', createdAt: now(),
      }],
      partes: [...partesExistentes, ...partesAdicionar],
      assuntos: [...assuntosAtuais, ...assuntosNovos],
      // Atualiza campos extras se ainda não preenchidos
      valorCausa:      existente.valorCausa      || dados.valorCausa      || null,
      dataAjuizamento: existente.dataAjuizamento || dados.dataAjuizamento || null,
      uf:              existente.uf              || dados.uf              || null,
      instancia:       existente.instancia       || dados.instancia       || null,
      tipoDocumento:   existente.tipoDocumento   || dados.tipoDocumento   || null,
      updatedAt: now(),
    };
    return { tipo: 'atualizar', processo: atualizado, num: dados.num, parte: dados.autor, texto: textoExtraido };
  } else {
    const proc = {
      id: uid(), numero: dados.num || file.name, tipo: 'juridico', fase: 'Conhecimento',
      parte: dados.autor, tribunal: dados.tribunal, tramitacao: dados.vara,
      valorCausa:      dados.valorCausa      || null,
      dataAjuizamento: dados.dataAjuizamento || null,
      uf:              dados.uf              || null,
      instancia:       dados.instancia       || null,
      tipoDocumento:   dados.tipoDocumento   || null,
      audiencias: aud, arquivos: arq ? [arq] : [], notas: [],
      partes: partesNovas,
      assuntos: dados.assuntos || [],
      createdAt: now(), updatedAt: now(),
    };
    return { tipo: 'criar', processo: proc, num: dados.num, parte: dados.autor, texto: textoExtraido };
  }
}
