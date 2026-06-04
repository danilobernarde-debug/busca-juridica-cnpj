// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

export const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

export const now = () => new Date().toISOString();

export function fmtData(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDataExtenso(s) {
  if (!s) return '';
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function fmtDataHora(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtTamanho(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
