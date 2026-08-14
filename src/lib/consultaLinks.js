// ─── LINKS DE CONSULTA PROCESSUAL ──────────────────────────────────────────
// Gera links úteis para consultar o processo diretamente no site do tribunal,
// a partir do campo `tribunal` (sigla livre, ex: TRT18, TJGO, TJSP, TRF3...).

// Domínios oficiais dos Tribunais de Justiça estaduais (bastante estáveis).
const TJ_DOMINIO = {
  AC: 'tjac.jus.br', AL: 'tjal.jus.br', AP: 'tjap.jus.br', AM: 'tjam.jus.br',
  BA: 'tjba.jus.br', CE: 'tjce.jus.br', DF: 'tjdft.jus.br', ES: 'tjes.jus.br',
  GO: 'tjgo.jus.br', MA: 'tjma.jus.br', MT: 'tjmt.jus.br', MS: 'tjms.jus.br',
  MG: 'tjmg.jus.br', PA: 'tjpa.jus.br', PB: 'tjpb.jus.br', PR: 'tjpr.jus.br',
  PE: 'tjpe.jus.br', PI: 'tjpi.jus.br', RJ: 'tjrj.jus.br', RN: 'tjrn.jus.br',
  RS: 'tjrs.jus.br', RO: 'tjro.jus.br', RR: 'tjrr.jus.br', SC: 'tjsc.jus.br',
  SP: 'tjsp.jus.br', SE: 'tjse.jus.br', TO: 'tjto.jus.br',
};

function limparNumero(numero) {
  return (numero || '').replace(/\D/g, '');
}

function numeroFormatadoCNJ(numero) {
  const d = limparNumero(numero);
  if (d.length !== 20) return (numero || '').trim();
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

// TRFs cuja Justiça Federal roda no PJe com subdomínios separados por grau
// (pje1g.trfN.jus.br / pje2g.trfN.jus.br).
const TRF_PJE_GRAU = new Set([1, 2, 3, 6]);

function grauDaInstancia(instanciaRaw) {
  const instancia = (instanciaRaw || '').trim();
  if (!instancia) return null;
  if (/1|primeir/i.test(instancia)) return 1;
  if (/2|segund/i.test(instancia)) return 2;
  return null;
}

// Links específicos por tribunal/segmento, quando o padrão de URL é conhecido.
function linksEspecificos(tribunalRaw, numero, instanciaRaw) {
  const tribunal = (tribunalRaw || '').trim().toUpperCase();
  const numFmt = numeroFormatadoCNJ(numero);
  const grau = grauDaInstancia(instanciaRaw);
  const links = [];

  const trt = tribunal.match(/^TRT ?0?(\d{1,2})$/);
  if (trt) {
    const n = parseInt(trt[1], 10);
    links.push({ label: `PJe do TRT${n} — consulta ao processo`, url: `https://pje.trt${n}.jus.br/consultaprocessual/detalhe-processo/${numFmt}/1` });
    links.push({ label: `Site do TRT${n}`, url: `https://www.trt${n}.jus.br` });
    return links;
  }

  const trf = tribunal.match(/^TRF ?0?(\d)$/);
  if (trf) {
    const n = parseInt(trf[1], 10);

    if (TRF_PJE_GRAU.has(n)) {
      if (grau !== 2) links.push({ label: `PJe do TRF${n} — 1º grau (buscar processo)`, url: `https://pje1g.trf${n}.jus.br/pje/ConsultaPublica/listView.seam` });
      if (grau !== 1) links.push({ label: `PJe do TRF${n} — 2º grau (buscar processo)`, url: `https://pje2g.trf${n}.jus.br/pje/ConsultaPublica/listView.seam` });
    } else if (n === 4) {
      // TRF4 usa e-proc, não PJe — 2º grau tem domínio único; 1º grau varia por seção judiciária (JFRS, JFSC, JFPR).
      if (grau !== 1) links.push({ label: 'e-proc do TRF4 — 2º grau (buscar processo)', url: 'https://eproc.trf4.jus.br/eproc2trf4/' });
      if (grau === 1) links.push({ label: 'Site do TRF4 (1º grau varia por seção judiciária — RS/SC/PR)', url: 'https://www.trf4.jus.br' });
    }

    links.push({ label: `Site do TRF${n}`, url: `https://www.trf${n}.jus.br` });
    return links;
  }

  const tj = tribunal.match(/^TJ ?([A-Z]{2})$/);
  if (tj && TJ_DOMINIO[tj[1]]) {
    const dominio = TJ_DOMINIO[tj[1]];
    links.push({ label: `Site do ${tribunal}`, url: `https://www.${dominio}` });
    if (tj[1] === 'SP') {
      links.push({ label: 'Consulta pública e-SAJ (TJSP)', url: 'https://esaj.tjsp.jus.br/cpopg/open.do' });
    }
    return links;
  }

  if (tribunal === 'TST') {
    links.push({ label: 'Consulta processual do TST', url: 'https://www.tst.jus.br/consultaprocessual' });
    links.push({ label: 'Site do TST', url: 'https://www.tst.jus.br' });
    return links;
  }

  if (tribunal === 'STJ') {
    links.push({ label: 'Pesquisa processual do STJ', url: 'https://processo.stj.jus.br/processo/pesquisa/' });
    links.push({ label: 'Site do STJ', url: 'https://www.stj.jus.br' });
    return links;
  }

  if (tribunal === 'STF') {
    links.push({ label: 'Consulta de processos do STF', url: 'https://portal.stf.jus.br/processos/' });
    links.push({ label: 'Site do STF', url: 'https://portal.stf.jus.br' });
    return links;
  }

  if (tribunal === 'MPT') {
    links.push({ label: 'Site do MPT', url: 'https://www.mpt.mp.br' });
    return links;
  }

  return links;
}

// Sempre disponíveis — funcionam para qualquer tribunal, sem depender de padrão de URL específico.
function linksGenericos(numero, tribunal) {
  const q = encodeURIComponent([numero, tribunal].filter(Boolean).join(' '));
  return [
    { label: 'Buscar no Google', url: `https://www.google.com/search?q=${q}+consulta+processual` },
    { label: 'Buscar no Jusbrasil', url: `https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(numero || '')}` },
  ];
}

export function gerarLinksConsulta(processo) {
  const numero = processo?.numero || '';
  const tribunal = processo?.tribunal || '';
  const instancia = processo?.instancia || '';
  return {
    numeroFormatado: numeroFormatadoCNJ(numero),
    especificos: linksEspecificos(tribunal, numero, instancia),
    genericos: linksGenericos(numero, tribunal),
  };
}
