const TIPOS_OPCOES = [
  { value: 'juridico',       label: 'Jurídico' },
  { value: 'administrativo', label: 'Administrativo' },
];


const TRIBUNAIS_OPCOES = [
  { value: 'TRT1',  label: 'TRT 1ª Região (RJ)' },
  { value: 'TRT2',  label: 'TRT 2ª Região (SP)' },
  { value: 'TRT3',  label: 'TRT 3ª Região (MG)' },
  { value: 'TRT4',  label: 'TRT 4ª Região (RS)' },
  { value: 'TRT5',  label: 'TRT 5ª Região (BA)' },
  { value: 'TRT6',  label: 'TRT 6ª Região (PE)' },
  { value: 'TRT7',  label: 'TRT 7ª Região (CE)' },
  { value: 'TRT8',  label: 'TRT 8ª Região (PA/AP)' },
  { value: 'TRT9',  label: 'TRT 9ª Região (PR)' },
  { value: 'TRT10', label: 'TRT 10ª Região (DF/TO)' },
  { value: 'TRT11', label: 'TRT 11ª Região (AM/RR)' },
  { value: 'TRT12', label: 'TRT 12ª Região (SC)' },
  { value: 'TRT13', label: 'TRT 13ª Região (PB)' },
  { value: 'TRT14', label: 'TRT 14ª Região (RO/AC)' },
  { value: 'TRT15', label: 'TRT 15ª Região (Campinas)' },
  { value: 'TRT16', label: 'TRT 16ª Região (MA)' },
  { value: 'TRT17', label: 'TRT 17ª Região (ES)' },
  { value: 'TRT18', label: 'TRT 18ª Região (GO)' },
  { value: 'TRT19', label: 'TRT 19ª Região (AL)' },
  { value: 'TRT20', label: 'TRT 20ª Região (SE)' },
  { value: 'TRT21', label: 'TRT 21ª Região (RN)' },
  { value: 'TRT22', label: 'TRT 22ª Região (PI)' },
  { value: 'TRT23', label: 'TRT 23ª Região (MT)' },
  { value: 'TRT24', label: 'TRT 24ª Região (MS)' },
  { value: 'TST',   label: 'TST' },
  { value: 'TJSP',  label: 'TJSP' },
  { value: 'TJRJ',  label: 'TJRJ' },
  { value: 'TJMG',  label: 'TJMG' },
  { value: 'TJRS',  label: 'TJRS' },
  { value: 'TJPR',  label: 'TJPR' },
  { value: 'TJSC',  label: 'TJSC' },
  { value: 'TJBA',  label: 'TJBA' },
  { value: 'TJPE',  label: 'TJPE' },
  { value: 'TJCE',  label: 'TJCE' },
  { value: 'TJGO',  label: 'TJGO' },
  { value: 'TJMS',  label: 'TJMS' },
  { value: 'TJMT',  label: 'TJMT' },
  { value: 'TJDFT', label: 'TJDFT' },
  { value: 'STJ',   label: 'STJ' },
  { value: 'STF',   label: 'STF' },
];

const TRAMITACAO_OPCOES = [
  { value: '1ª Instância', label: '1ª Instância' },
  { value: '2ª Instância', label: '2ª Instância' },
  { value: 'TST',          label: 'TST' },
  { value: 'STJ',          label: 'STJ' },
  { value: 'STF',          label: 'STF' },
];

export const CAMPOS_PADRAO = {
  tribunal: {
    label: 'Tribunal',
    coluna: 'tribunal',
    propriedade: 'tribunal',
    tipo: 'select',
    operadores: ['igual', 'diferente'],
    opcoes: TRIBUNAIS_OPCOES,
  },
  tramitacao: {
    label: 'Tramitação',
    coluna: 'tramitacao',
    propriedade: 'tramitacao',
    tipo: 'select',
    operadores: ['igual', 'diferente'],
    opcoes: TRAMITACAO_OPCOES,
  },
  assunto: {
    label: 'Assunto',
    coluna: 'assunto',
    propriedade: 'assuntos', // array no objeto JS
    isArray: true,
    tipo: 'texto',
    operadores: ['contém', 'igual', 'diferente'],
  },
  notas: {
    label: 'Notas / Comentários',
    coluna: 'notas',
    propriedade: 'notas',
    isArray: true,
    arrayField: 'texto',
    tipo: 'texto',
    operadores: ['contém', 'igual'],
  },
  valor_causa: {
    label: 'Valor da Causa',
    coluna: 'valor_causa',
    propriedade: 'valorCausa', // camelCase no objeto JS
    tipo: 'numero',
    operadores: ['=', '>', '<', '>=', '<=', 'entre'],
  },
  data_ajuizamento: {
    label: 'Data de Ajuizamento',
    coluna: 'data_ajuizamento',
    propriedade: 'dataAjuizamento', // camelCase no objeto JS
    tipo: 'data',
    operadores: ['igual', 'antes', 'depois'],
  },
};
