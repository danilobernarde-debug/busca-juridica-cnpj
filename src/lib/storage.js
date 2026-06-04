// Fallback localStorage — usado apenas quando Supabase não está disponível
export const STORAGE_KEY = 'sj_db_machado_v2';

export function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    processos: [],
    config: { claudeKey: import.meta.env.VITE_CLAUDE_KEY || '' }
  };
}

export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {
    alert('Erro ao salvar: ' + e.message);
  }
}
