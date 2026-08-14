// ─── PROXY PARA A API DA ANTHROPIC ──────────────────────────────────────────
// O frontend nunca guarda nem envia a chave da Anthropic — ela fica só aqui,
// em variável de ambiente do servidor (ANTHROPIC_API_KEY, sem prefixo VITE_,
// então o Vite nunca a embute no bundle). Autenticado pela sessão do usuário
// logado no Supabase, igual ao /api/sync-datajud.
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY não configuradas' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const token = (req.headers['authorization'] || '').replace(/^Bearer /, '');
  const { data: userData } = token ? await supabase.auth.getUser(token) : { data: null };
  if (!userData?.user) return res.status(401).json({ error: 'unauthorized' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'IA não configurada no servidor (variável ANTHROPIC_API_KEY ausente).' });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });
  const data = await resp.json();
  return res.status(resp.status).json(data);
}
