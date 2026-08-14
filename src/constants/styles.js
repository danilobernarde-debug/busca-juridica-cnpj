// ─── CORES / ESTILOS ──────────────────────────────────────────────────────────

export const FASE_STYLE = {
  Conhecimento: { bg: 'rgba(59,130,246,.15)', color: '#60a5fa', label: 'Conhecimento' },
  Execução:     { bg: 'rgba(239,68,68,.15)',  color: '#f87171', label: 'Execução' },
  Arquivado:    { bg: 'rgba(148,163,184,.1)', color: '#94a3b8', label: 'Arquivado' },
};

export const TIPO_STYLE = {
  juridico:      { bg: 'rgba(139,92,246,.15)', color: '#a78bfa', icon: '⚖️', label: 'Jurídico' },
  administrativo:{ bg: 'rgba(249,115,22,.15)', color: '#fb923c', icon: '🏛️', label: 'Administrativo' },
};

export const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'juridico',  icon: '⚖️', label: 'Jurídico' },
  { id: 'adm',       icon: '🏛️', label: 'Administrativo' },
  { id: 'agenda',    icon: '📅', label: 'Agenda' },
  { id: 'movimentacoes', icon: '🕘', label: 'Movimentações' },
  { id: 'usuarios',  icon: '👥', label: 'Usuários', adminOnly: true },
  { id: 'config',    icon: '⚙️', label: 'Configurações', adminOnly: true },
  { id: 'acessos',   icon: '🔍', label: 'Acessos', ownerOnly: true },
];

export const POLO_LABEL = { ativo: 'Polo Ativo', passivo: 'Polo Passivo', outro: 'Outro' };
export const POLO_COLOR = { ativo: 'var(--blue)', passivo: 'var(--red)', outro: 'var(--muted)' };
