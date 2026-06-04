// ─── STORAGE ─────────────────────────────────────────────────────────────────
import { uid, now } from './utils.js';

export const STORAGE_KEY = 'sj_db_machado_v2';

const PROCESSOS_INICIAIS = [
  { numero:"463/2025", tipo:"administrativo", fase:"Conhecimento", parte:"Município Rondonópolis", tribunal:"Adm", tramitacao:"Rondonópolis", obs:"Pendente resultado da defesa adm." },
  { numero:"000447.2025.18.003/2", tipo:"administrativo", fase:"Conhecimento", parte:"MPT", tribunal:"Adm", tramitacao:"PRT 18ª/PTM Anápolis", obs:"Aud. online 02/09/2026 - 14:00" },
  { numero:"007094-005/2025", tipo:"administrativo", fase:"Arquivado", parte:"MPMT", tribunal:"Adm", tramitacao:"Promotoria Rondonópolis/MT", obs:"TAC não firmado." },
  { numero:"310/2025", tipo:"administrativo", fase:"Conhecimento", parte:"Município Rondonópolis", tribunal:"Adm", tramitacao:"Rondonópolis", obs:"Defesa adm apresentada. Aguardando resultado" },
  { numero:"14152.197793/2025-16", tipo:"administrativo", fase:"Conhecimento", parte:"SRTE", tribunal:"Adm", tramitacao:"SRTE Goiás", obs:"Recurso apresentado em 13/03/2026. Pendente decisão." },
  { numero:"5144799-95.2025.8.09.0051", tipo:"juridico", fase:"Arquivado", parte:"Rayc Consultoria", tribunal:"TJGO", tramitacao:"2ª UPJ - Juizados Goiânia", obs:"Sentença. Extinção Execução" },
  { numero:"5832162-77.2025.8.09.0049", tipo:"juridico", fase:"Execução", parte:"I.R. Neutzling & Cia LTDA", tribunal:"TJGO", tramitacao:"1ª Vara Cível - Goianésia/GO", obs:"Prazo 15 dias para pagar voluntariamente" },
  { numero:"6017980-76.2025.8.09.0090", tipo:"juridico", fase:"Execução", parte:"Marcelo Mello Dos Santos", tribunal:"TJGO", tramitacao:"Juizado Cível - Jandaia/GO", obs:"Bloqueio de valor em conta. Embargos até 04/05" },
  { numero:"5786744-19.2025.8.09.0049", tipo:"juridico", fase:"Execução", parte:"Sicredi Celeiro Centro Oeste", tribunal:"TJGO", tramitacao:"2ª Vara Cível - Goianésia/GO", obs:"Convertida monitória em Execução." },
  { numero:"5395280-84.2025.8.09.0049", tipo:"juridico", fase:"Execução", parte:"Loc Frotas Locações S.A.", tribunal:"TJGO", tramitacao:"2ª Vara Cível - Goianésia/GO", obs:"Prazo para embargos a execução ou parcelamento até 19/03." },
  { numero:"5181429-19.2026.8.09.0051", tipo:"juridico", fase:"Conhecimento", parte:"Wstalin Sardinha da Costa e outros", tribunal:"TJGO", tramitacao:"3º Juizado Cível - Goiânia/GO", obs:"Defesa apresentada" },
  { numero:"5198812-16.2026.8.09.0049", tipo:"juridico", fase:"Execução", parte:"Multiclínica Goianésia", tribunal:"TJGO", tramitacao:"1ª Vara Cível - Goianésia/GO", obs:"Formalizado acordo." },
  { numero:"5339379-44.2025.8.09.0175", tipo:"juridico", fase:"Execução", parte:"Renilde Rodrigues Pereira", tribunal:"TJGO", tramitacao:"Juizado cível Aruanã", obs:"Cump. sentença. prazo 15 dias." },
  { numero:"0828686-46.2025.8.12.0110", tipo:"juridico", fase:"Conhecimento", parte:"Jonso de Sousa ME", tribunal:"TJMS", tramitacao:"11ª Juizado Cível - Campo Grande/MS", obs:"Acordo formalizado em audiência" },
  { numero:"0800561-60.2025.8.12.0048", tipo:"juridico", fase:"Conhecimento", parte:"Rafael Eliseu Nery Duarte", tribunal:"TJMS", tramitacao:"Vara Cível Rio Negro/MS", obs:"Aud. conciliação (videoconferência) 25/05/26" },
  { numero:"0824192-41.2025.8.12.0110", tipo:"juridico", fase:"Execução", parte:"Metalflex Conexoes Flexiveis LTDA", tribunal:"TJMS", tramitacao:"11ª Juizado Cível - Campo Grande/MS", obs:"Noticiado desc. acordo. possível bloqueio SISBAJUD e RENAJUD" },
  { numero:"1005651-96.2026.8.11.0003", tipo:"juridico", fase:"Conhecimento", parte:"Ministério Público MT", tribunal:"TJMT", tramitacao:"3ª Vara Cível - Rondonópolis/MT", obs:"Prazo para defesa até 12/05" },
  { numero:"1043593-08.2025.8.11.0001", tipo:"juridico", fase:"Execução", parte:"Rotacar Auto Eletrica e Mecanica LTDA", tribunal:"TJMT", tramitacao:"Núcleo Juizados MT", obs:"Comunicado descumprimento acordo." },
  { numero:"4035192-46.2025.8.26.0002", tipo:"juridico", fase:"Execução", parte:"Akad Seguros S.A", tribunal:"TJSP", tramitacao:"12ª Vara Cível - Santo Amaro/SP", obs:"Akad pediu continuidade da execução." },
  { numero:"4082454-86.2025.8.26.0100", tipo:"juridico", fase:"Execução", parte:"Banco Daycoval S.A.", tribunal:"TJSP", tramitacao:"13ª Vara Cível - Foro Central", obs:"Confirmação de citação ainda não anexa." },
  { numero:"0000207-09.2026.8.27.2702", tipo:"juridico", fase:"Conhecimento", parte:"Danilo Jose Zuffo Borges LTDA", tribunal:"TJTO", tramitacao:"1ª Vara Cível - Alvorada/TO", obs:"Sentença de procedência. Prazo para Recurso até 30/04" },
  { numero:"0001651-15.2025.8.27.2734", tipo:"juridico", fase:"Conhecimento", parte:"Polícia Militar Tocantins", tribunal:"TJTO", tramitacao:"Juizado Criminal - Peixe/TO", obs:"Acordo de transação penal." },
  { numero:"0001751-48.2026.8.27.2729", tipo:"juridico", fase:"Conhecimento", parte:"Comercial de Combustível Casa Tua Eireli", tribunal:"TJTO", tramitacao:"1ª Vara Cível - Palmas/TO", obs:"Aud. conciliação (telepresencial) 15/05/2026 - 14:30." },
  { numero:"0001779-37.2026.8.27.2722", tipo:"juridico", fase:"Conhecimento", parte:"Michelle Gomes Sales e outro", tribunal:"TJTO", tramitacao:"2ª Vara Cível - Gurupi/TO", obs:"Prazo 15 dias para contestar ação de despejo. Prazo até 07/05" },
  { numero:"0008063-95.2025.8.27.2722", tipo:"juridico", fase:"Execução", parte:"Alencar Veiga e Advogados", tribunal:"TJTO", tramitacao:"3ª Vara Cível - Gurupi/TO", obs:"Verificar processo 07/05" },
  { numero:"0009151-71.2025.8.27.2722", tipo:"juridico", fase:"Execução", parte:"Asas Construções LTDA", tribunal:"TJTO", tramitacao:"3ª Vara Cível - Gurupi/TO", obs:"Descumprimento do acordo. Pediu cumprimento de sentença." },
  { numero:"0010266-30.2025.8.27.2722", tipo:"juridico", fase:"Execução", parte:"Posto Javae LTDA", tribunal:"TJTO", tramitacao:"1ª Vara Cível - Gurupi/TO", obs:"Descumprimento do acordo. Pediu cumprimento de sentença." },
  { numero:"0020019-72.2026.5.04.0812", tipo:"juridico", fase:"Conhecimento", parte:"Jeferson Presa Arredondo", tribunal:"TRT04", tramitacao:"2ª VT - Bagé/RS", obs:"Formalizado acordo em audiência" },
  { numero:"0022986-98.2025.5.04.0271", tipo:"juridico", fase:"Conhecimento", parte:"Senergisul-RS", tribunal:"TRT04", tramitacao:"VT - Osório/RS", obs:"Prazo até 05/05" },
  { numero:"0002703-20.2025.5.07.0029", tipo:"juridico", fase:"Conhecimento", parte:"Luiz Gustavo Tomaz Ubatuba", tribunal:"TRT07", tramitacao:"VT - Tianguá/CE", obs:"Aguardando intimação." },
  { numero:"0000327-28.2021.5.10.0802", tipo:"juridico", fase:"Arquivado", parte:"Luis Felipe Silva Sousa", tribunal:"TRT10", tramitacao:"2ª VT - Palmas/TO", obs:"Processo Arquivado." },
  { numero:"0000831-96.2024.5.10.0812", tipo:"juridico", fase:"Arquivado", parte:"Divino Alves Batista", tribunal:"TRT10", tramitacao:"2ª VT - Araguaína/TO", obs:"Processo pronto para arquivamento." },
  { numero:"0000799-94.2024.5.10.0811", tipo:"juridico", fase:"Conhecimento", parte:"João Domingos Alves Pereira", tribunal:"TRT10", tramitacao:"1ª VT - Araguaína/TO", obs:"Sentença de parcial procedência. RO em julgamento" },
  { numero:"0001383-60.2025.5.10.0801", tipo:"juridico", fase:"Conhecimento", parte:"Jose de Jesus Gomes da Luz", tribunal:"TRT10", tramitacao:"1ª VT - Palmas/TO", obs:"Julgado procedentes. RO em julgamento." },
  { numero:"0001419-02.2025.5.10.0802", tipo:"juridico", fase:"Conhecimento", parte:"Adaoilton Alves de Sousa", tribunal:"TRT10", tramitacao:"1ª VT - Palmas/TO", obs:"Sentença parcialmente procedente. RO em julgamento." },
  { numero:"0000840-89.2025.5.18.0201", tipo:"juridico", fase:"Conhecimento", parte:"Paulo Henrique Ramos Caetano", tribunal:"TRT18", tramitacao:"VT - Uruaçu/GO", obs:"Descumprimento do acordo. Aguardando cálculos." },
  { numero:"0001205-05.2025.5.18.0053", tipo:"juridico", fase:"Conhecimento", parte:"Bruno Almeida Teixeira", tribunal:"TRT18", tramitacao:"3ª VT - Anápolis/GO", obs:"Descumprimento do acordo. Aguardando cálculos." },
  { numero:"0881-67.2024.5.23.0002", tipo:"juridico", fase:"Conhecimento", parte:"Regina Lucia Almeida dos Santos Lima", tribunal:"TRT23", tramitacao:"9ª VT - Cuiabá/MT", obs:"Aguardando julgamento TRT." },
  { numero:"0000874-75.2024.5.23.0002", tipo:"juridico", fase:"Conhecimento", parte:"Regina Lucia Almeida dos Santos Lima", tribunal:"TRT23", tramitacao:"2ª VT - Cuiabá/MT", obs:"Liquidação do saldo devedor" },
  { numero:"0024217-30.2025.5.24.0005", tipo:"juridico", fase:"Conhecimento", parte:"Joanilson Raimundo Pereira Dias", tribunal:"TRT24", tramitacao:"5ª VT - Campo Grande/MS", obs:"Sentença parcialmente procedente. RO aguardando julgamento." },
  { numero:"0024153-29.2025.5.24.0002", tipo:"juridico", fase:"Conhecimento", parte:"Diego Henrique de Sousa", tribunal:"TRT24", tramitacao:"2ª VT - Campo Grande/MS", obs:"RO em julgamento." },
  { numero:"0025112-85.2025.5.24.0006", tipo:"juridico", fase:"Conhecimento", parte:"Denilson Paula da Costa", tribunal:"TRT24", tramitacao:"6ª VT - Campo Grande/MS", obs:"Apresentar quesitos perícia até 29/01/26" },
  { numero:"0025464-49.2025.5.24.0004", tipo:"juridico", fase:"Conhecimento", parte:"Anderson Leandro Lima", tribunal:"TRT24", tramitacao:"4ª VT - Campo Grande/MS", obs:"Sentença de parcial procedência." },
];

export function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    processos: PROCESSOS_INICIAIS.map((p, i) => ({
      id: `p${i + 1}`, ...p,
      audiencias: [], movimentacoes: [], arquivos: [],
      notas: p.obs ? [{ id: uid(), texto: p.obs, autor: 'Importado', createdAt: now() }] : [],
      createdAt: now(), updatedAt: now()
    })),
    config: { claudeKey: import.meta.env.VITE_CLAUDE_KEY || '' }
  };
}

export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {
    alert('Erro ao salvar: ' + e.message);
  }
}
