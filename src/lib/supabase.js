// ─── SUPABASE ─────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { comprimirImagem } from './compress.js';
import { uid } from './utils.js';

export const sbClient = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY)
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
  : null;

const STORAGE_BUCKET = 'juridico';

export async function sb_uploadArquivo(processoId, file) {
  const processado = await comprimirImagem(file);
  const ext = processado.name.includes('.') ? processado.name.split('.').pop() : '';
  const path = `processos/${processoId}/${crypto.randomUUID()}${ext ? '.' + ext : ''}`;
  const { error } = await sbClient.storage.from(STORAGE_BUCKET).upload(path, processado);
  if (error) throw error;
  const { data } = sbClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, nome: file.name, tipo: processado.type, tamanho: processado.size, base64: null };
}

export async function sb_deletarArquivoStorage(url) {
  if (!url || !url.includes(`/object/public/${STORAGE_BUCKET}/`)) return;
  const path = url.split(`/object/public/${STORAGE_BUCKET}/`)[1];
  if (path) await sbClient.storage.from(STORAGE_BUCKET).remove([path]);
}

export async function sb_carregar() {
  const { data, error } = await sbClient
    .from('jud_processos')
    .select('*, jud_audiencias(*), jud_notas(*), jud_movimentacoes(*), jud_arquivos(*), jud_partes(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(p => ({
    id: p.id,
    numero: p.numero,
    tipo: p.tipo,
    fase: p.fase,
    parte: p.parte || '',
    tribunal: p.tribunal || '',
    tramitacao: p.tramitacao || '',
    assuntos: p.assuntos || [],
    valorCausa: p.valor_causa || null,
    dataAjuizamento: p.data_ajuizamento || null,
    uf: p.uf || null,
    instancia: p.instancia || null,
    tipoDocumento: p.tipo_documento || null,
    partes: (p.jud_partes || []).map(pt => ({ id: pt.id, nome: pt.nome, documento: pt.documento || '', polo: pt.polo, tipo_pessoa: pt.tipo_pessoa || '' })),
    audiencias: (p.jud_audiencias || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(a => ({ id: a.id, data: a.data, hora: a.hora?.slice(0, 5) || '', tipo: a.tipo || '', local: a.local || '', obs: a.obs || '' })),
    notas: (p.jud_notas || [])
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(n => ({ id: n.id, texto: n.texto, autor: n.autor, createdAt: n.created_at })),
    movimentacoes: (p.jud_movimentacoes || [])
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .map(m => ({ id: m.id, data: m.data, hora: m.hora || '', evento: m.evento, origem: m.origem || '', createdAt: m.created_at })),
    arquivos: (p.jud_arquivos || [])
      .map(f => ({ id: f.id, nome: f.nome, tipo: f.tipo || '', tamanho: f.tamanho || 0, tamanhoComprimido: f.tamanho_comprimido || 0, base64: f.base64, url: f.url_externa, addedAt: f.created_at })),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

async function _migrarArquivosParaStorage(processoId, arquivos) {
  return Promise.all((arquivos || []).map(async (f) => {
    if (f.url || !f.base64?.startsWith('data:')) return f;
    const [header, data] = f.base64.split(',');
    const mime = (header.match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const file = new File([arr], f.nome, { type: mime });
    const uploaded = await sb_uploadArquivo(processoId, file);
    return { ...f, base64: null, url: uploaded.url };
  }));
}

export async function sb_salvar(proc) {
  // Verifica sessão ativa
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) throw new Error('Sessão expirada — faça login novamente');

  const { data, error: pe } = await sbClient.from('jud_processos').upsert({
    id: proc.id,
    numero: proc.numero, tipo: proc.tipo, fase: proc.fase,
    parte: proc.parte || '', tribunal: proc.tribunal || '', tramitacao: proc.tramitacao || '',
    assuntos: proc.assuntos || [],
    valor_causa: proc.valorCausa || null,
    data_ajuizamento: proc.dataAjuizamento || null,
    uf: proc.uf || null,
    instancia: proc.instancia || null,
    tipo_documento: proc.tipoDocumento || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select();
  if (pe) throw pe;
  if (!data?.length) throw new Error('Nenhum dado retornado pelo Supabase após salvar');
  const pid = data[0].id;

  await sbClient.from('jud_audiencias').delete().eq('processo_id', pid);
  if (proc.audiencias?.length) {
    const { error } = await sbClient.from('jud_audiencias').insert(
      proc.audiencias.map(a => ({ id: a.id, processo_id: pid, data: a.data, hora: a.hora || null, tipo: a.tipo, local: a.local || '', obs: a.obs || '' }))
    );
    if (error) throw error;
  }

  await sbClient.from('jud_notas').delete().eq('processo_id', pid);
  if (proc.notas?.length) {
    const { error } = await sbClient.from('jud_notas').insert(
      proc.notas.map(n => ({ id: n.id, processo_id: pid, texto: n.texto, autor: n.autor || 'Usuário', created_at: n.createdAt }))
    );
    if (error) throw error;
  }

  const arquivos = await _migrarArquivosParaStorage(pid, proc.arquivos);
  await sbClient.from('jud_arquivos').delete().eq('processo_id', pid);
  if (arquivos.length) {
    const { error } = await sbClient.from('jud_arquivos').insert(
      arquivos.map(f => ({ id: f.id, processo_id: pid, nome: f.nome, tipo: f.tipo || '', tamanho: f.tamanho || 0, tamanho_comprimido: f.tamanhoComprimido || 0, base64: f.base64 || null, url_externa: f.url || null }))
    );
    if (error) throw error;
  }

  await sbClient.from('jud_movimentacoes').delete().eq('processo_id', pid);
  if (proc.movimentacoes?.length) {
    const { error } = await sbClient.from('jud_movimentacoes').insert(
      proc.movimentacoes.map(m => ({ id: m.id, processo_id: pid, data: m.data || null, hora: m.hora || null, evento: m.evento, origem: m.origem || null }))
    );
    if (error) throw error;
  }

  await sbClient.from('jud_partes').delete().eq('processo_id', pid);
  if (proc.partes?.length) {
    const { error } = await sbClient.from('jud_partes').insert(
      proc.partes.map(pt => ({ id: pt.id || uid(), processo_id: pid, nome: pt.nome, documento: pt.documento || null, polo: pt.polo, tipo_pessoa: pt.tipo_pessoa || null }))
    );
    if (error) throw error;
  }

  return { ...proc, id: pid, arquivos };
}

export async function sb_deletar(id) {
  const { error } = await sbClient.from('jud_processos').delete().eq('id', id);
  if (error) throw error;
}

export async function sb_migrar(processos) {
  for (const proc of processos) {
    await sb_salvar(proc);
  }
}

export async function sb_carregarVistos(userUuid) {
  if (!sbClient || !userUuid) return new Set();
  const { data } = await sbClient
    .from('jud_processos_vistos')
    .select('processo_id')
    .eq('user_uuid', userUuid);
  return new Set((data || []).map(r => r.processo_id));
}

export async function sb_marcarVisto(userUuid, processoId) {
  if (!sbClient || !userUuid || !processoId) return;
  await sbClient.from('jud_processos_vistos').upsert(
    { user_uuid: userUuid, processo_id: processoId },
    { onConflict: 'user_uuid,processo_id' }
  );
}

export async function sb_marcarTodosVistos(userUuid, processoIds) {
  if (!sbClient || !userUuid || !processoIds?.length) return;
  const rows = processoIds.map(id => ({ user_uuid: userUuid, processo_id: id }));
  await sbClient.from('jud_processos_vistos').upsert(rows, { onConflict: 'user_uuid,processo_id' });
}
