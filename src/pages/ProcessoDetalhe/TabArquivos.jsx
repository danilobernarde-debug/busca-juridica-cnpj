import { useRef, useState } from 'react';
import { fmtTamanho, fmtDataHora } from '../../lib/utils.js';
import { sbClient, sb_uploadArquivo } from '../../lib/supabase.js';

export default function TabArquivos({ arquivos, onAdd, onDel, processoId }) {
  const inputRef = useRef();
  const [urlForm, setUrlForm] = useState({ nome: '', url: '' });
  const [modoUrl, setModoUrl] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroUpload, setErroUpload] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setErroUpload(null);

    if (sbClient && processoId) {
      setEnviando(true);
      try {
        const arq = await sb_uploadArquivo(processoId, file);
        onAdd(arq);
      } catch (err) {
        setErroUpload('Erro no upload: ' + err.message);
      } finally {
        setEnviando(false);
      }
    } else {
      // Fallback: base64 local (sem Supabase)
      if (file.size > 5 * 1024 * 1024) { alert('Arquivo muito grande. Máximo: 5 MB.'); return; }
      const reader = new FileReader();
      reader.onload = ev => onAdd({ nome: file.name, tipo: file.type, tamanho: file.size, base64: ev.target.result, url: null });
      reader.readAsDataURL(file);
    }
  };

  const handleUrl = () => {
    if (!urlForm.nome || !urlForm.url) return;
    onAdd({ nome: urlForm.nome, tipo: 'link', tamanho: 0, base64: null, url: urlForm.url });
    setUrlForm({ nome: '', url: '' });
    setModoUrl(false);
  };

  const fileIcon = (tipo) => {
    if (!tipo) return '📄';
    if (tipo.includes('pdf')) return '📕';
    if (tipo.includes('word') || tipo.includes('docx')) return '📝';
    if (tipo.includes('sheet') || tipo.includes('xlsx')) return '📊';
    if (tipo.includes('image')) return '🖼️';
    if (tipo === 'link') return '🔗';
    return '📄';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => inputRef.current.click()} disabled={enviando}>
          {enviando ? '⏳ Enviando...' : '📎 Anexar arquivo'}
        </button>
        <button className="btn-secondary" onClick={() => setModoUrl(!modoUrl)}>🔗 Adicionar link</button>
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      {erroUpload && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
          {erroUpload}
        </div>
      )}

      {modoUrl && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}><label>Nome / descrição</label><input value={urlForm.nome} onChange={e => setUrlForm({ ...urlForm, nome: e.target.value })} placeholder="ex: Petição Inicial" /></div>
          <div className="field" style={{ flex: 2 }}><label>URL (SharePoint, OneDrive, etc.)</label><input value={urlForm.url} onChange={e => setUrlForm({ ...urlForm, url: e.target.value })} placeholder="https://..." /></div>
          <button className="btn-primary" onClick={handleUrl} disabled={!urlForm.nome || !urlForm.url}>Salvar</button>
          <button className="btn-secondary" onClick={() => setModoUrl(false)}>✕</button>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
        {sbClient ? 'Arquivos enviados para o Supabase Storage.' : 'Arquivos salvos no navegador (máx. 5 MB). Para arquivos grandes, use links.'}
      </div>

      {arquivos.map(a => (
        <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 24 }}>{fileIcon(a.tipo)}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.tipo === 'link' ? 'Link externo' : fmtTamanho(a.tamanho)} · {fmtDataHora(a.addedAt)}</div>
          </div>
          {a.url && <a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontSize: 12, textDecoration: 'none', padding: '4px 10px', border: '1px solid rgba(59,130,246,.3)', borderRadius: 6 }}>Abrir</a>}
          {a.base64 && !a.url && <a href={a.base64} download={a.nome} style={{ color: 'var(--blue)', fontSize: 12, textDecoration: 'none', padding: '4px 10px', border: '1px solid rgba(59,130,246,.3)', borderRadius: 6 }}>Baixar</a>}
          <button className="btn-ghost" onClick={() => onDel(a.id)} style={{ fontSize: 14 }}>✕</button>
        </div>
      ))}
      {arquivos.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Nenhum arquivo anexado.</div>}
    </div>
  );
}
