// ─── CLIENTE CLAUDE (via proxy server-side) ────────────────────────────────
// Chama /api/claude em vez da Anthropic direto — a chave fica só no servidor.
// Autentica com o token de sessão do usuário logado no Supabase.
import { sbClient } from './supabase.js';

export async function chamarClaude(body) {
  if (!sbClient) throw new Error('Supabase não configurado.');
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada — faça login novamente.');

  const resp = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || data.error || 'Erro na API Claude');
  return data;
}
