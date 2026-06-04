import { useState, useEffect, useCallback, useRef } from 'react';
import { useMobile } from './lib/utils.js';
import { sbClient, sb_carregar, sb_salvar, sb_deletar, sb_migrar, sb_carregarVistos, sb_marcarVisto } from './lib/supabase.js';
import { loadData, saveData } from './lib/storage.js';
import Sidebar from './components/Sidebar.jsx';
import ProcessoForm from './components/ProcessoForm.jsx';
import ModalDJE from './components/ModalDJE.jsx';
import ModalTexto from './components/ModalTexto.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProcessoList from './pages/ProcessoList.jsx';
import Agenda from './pages/Agenda.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import AcessoLog from './pages/AcessoLog.jsx';
import { registrarAcesso } from './lib/accessLog.js';
import ProcessoDetalhe from './pages/ProcessoDetalhe/index.jsx';

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [processos, setProcessos] = useState([]);
  const [config, setConfig] = useState({ claudeKey: import.meta.env.VITE_CLAUDE_KEY || '' });
  const [carregando, setCarregando] = useState(true);
  const jaCarregouRef = useRef(false);
  const [erroSB, setErroSB] = useState(null);
  const [view, setView] = useState('dashboard');
  const [processoAberto, setProcessoAberto] = useState(null);
  const [adicionando, setAdicionando] = useState(null);
  const [showDJE, setShowDJE] = useState(false);
  const [visitados, setVisitados] = useState(new Set());

  const marcarVisitado = (id) => {
    if (visitados.has(id)) return;
    setVisitados(prev => { const n = new Set(prev); n.add(id); return n; });
    if (user) sb_marcarVisto(user.id, id);
  };
  const [showTexto, setShowTexto] = useState(false);

  useEffect(() => {
    if (!sbClient) {
      // Sem Supabase: carrega localStorage direto
      const local = loadData();
      setProcessos(local.processos || []);
      setConfig(local.config || { claudeKey: import.meta.env.VITE_CLAUDE_KEY || '' });
      setCarregando(false);
      return;
    }

    const carregarPerfil = async (uid) => {
      const { data } = await sbClient.from('d_auth_user').select('is_super_admin, nome').eq('uuid', uid).single();
      setIsSuperAdmin(data?.is_super_admin || false);
      return data?.nome || '';
    };

    // Verifica sessão existente
    sbClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        carregarPerfil(session.user.id);
        carregarDados(false, session.user.id);
      } else {
        setCarregando(false);
      }
    });

    // Escuta mudanças de auth
    const { data: { subscription } } = sbClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        const nome = await carregarPerfil(session.user.id);
        carregarDados(jaCarregouRef.current, session.user.id);
        if (!jaCarregouRef.current) registrarAcesso(sbClient, session.user, nome);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsSuperAdmin(false);
        setProcessos([]);
        setView('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const carregarDados = async (silencioso = false, userId = null) => {
    if (!silencioso) setCarregando(true);
    try {
      const [dados, vistos] = await Promise.all([
        sb_carregar(),
        sb_carregarVistos(userId),
      ]);
      setProcessos(dados);
      setVisitados(vistos);
      setErroSB(null);
      jaCarregouRef.current = true;
    } catch (e) {
      console.error('Supabase:', e);
      setErroSB(e.message);
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  const logout = async () => {
    await sbClient.auth.signOut();
  };

  const salvarSB = async (proc) => {
    if (!sbClient) return null;
    try {
      return await sb_salvar(proc);
    } catch (e) {
      const msg = e?.message || e?.details || JSON.stringify(e);
      console.error('Supabase save error:', e);
      setErroSB('Erro ao salvar: ' + msg);
      return null;
    }
  };

  const updateProcesso = useCallback(async (proc) => {
    setProcessos(prev => prev.map(p => p.id === proc.id ? proc : p));
    if (processoAberto?.id === proc.id) setProcessoAberto(proc);
    if (sbClient) await salvarSB(proc);
    else saveData({ processos: processos.map(p => p.id === proc.id ? proc : p), config });
  }, [processos, processoAberto, config]);

  const addProcesso = useCallback(async (proc) => {
    // Verifica se já existe processo com o mesmo número (ignora pontuação)
    const normalizar = (n) => (n || '').replace(/[\s.\-\/]/g, '');
    const duplicado = proc.numero && processos.find(p =>
      p.id !== proc.id && normalizar(p.numero) === normalizar(proc.numero)
    );

    if (duplicado) {
      const confirmar = confirm(
        `O processo ${proc.numero} já está cadastrado.\n\nDeseja substituir os dados existentes?`
      );
      if (!confirmar) return;
      // Atualiza o processo existente preservando o id original
      const atualizado = { ...duplicado, ...proc, id: duplicado.id, createdAt: duplicado.createdAt };
      setProcessos(prev => prev.map(p => p.id === duplicado.id ? atualizado : p));
      if (sbClient) await salvarSB(atualizado);
      else saveData({ processos: processos.map(p => p.id === duplicado.id ? atualizado : p), config });
      setAdicionando(null);
      setProcessoAberto(atualizado);
      setView('detalhe');
      return;
    }

    const saved = sbClient ? (await salvarSB(proc) || proc) : proc;
    if (!sbClient) saveData({ processos: [proc, ...processos], config });
    setProcessos(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
    setAdicionando(null);
    setProcessoAberto(saved);
    setView('detalhe');
  }, [processos, config]);

  const delProcesso = useCallback(async (id) => {
    if (sbClient) { try { await sb_deletar(id); } catch (e) { setErroSB('Erro ao deletar: ' + e.message); } }
    else saveData({ processos: processos.filter(p => p.id !== id), config });
    setProcessos(prev => prev.filter(p => p.id !== id));
    setProcessoAberto(null);
    setView('dashboard');
  }, [processos, config]);

  const saveConfig = useCallback((cfg) => {
    setConfig(cfg);
    saveData({ processos, config: cfg });
  }, [processos]);

  const migrarLocalParaSB = async () => {
    if (!sbClient) return;
    const local = loadData();
    if (!local.processos?.length) { alert('Nenhum dado local para migrar.'); return; }
    if (!confirm(`Migrar ${local.processos.length} processos do localStorage para o Supabase?`)) return;
    try {
      await sb_migrar(local.processos);
      const dados = await sb_carregar();
      setProcessos(dados);
      alert('Migração concluída!');
    } catch (e) { alert('Erro na migração: ' + e.message); }
  };

  const counts = {
    juridico: processos.filter(p => p.tipo === 'juridico' && p.fase !== 'Arquivado').length,
    adm: processos.filter(p => p.tipo === 'administrativo' && p.fase !== 'Arquivado').length,
    agenda: processos.flatMap(p => (p.audiencias || []).filter(a => a.data >= new Date().toISOString().slice(0, 10))).length,
  };

  // Sem sessão → mostra login
  if (sbClient && !user && !carregando) return <Login />;

  if (carregando) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--muted)', minHeight: '100vh' }}>
      <div style={{ fontSize: 40 }}>⚖️</div>
      <div style={{ fontSize: 14 }}>Carregando{user ? ' dados' : ''}...</div>
    </div>
  );

  // Quando está em form/detalhe, esconde as páginas persistentes
  const mobile = useMobile();
  const mostrarPersistente = !adicionando && view !== 'detalhe';
  const css = (v) => ({ display: mostrarPersistente && view === v ? 'flex' : 'none', flex: 1, flexDirection: 'column', minWidth: 0, overflow: 'auto' });

  return (
    <>
      <Sidebar view={adicionando ? '' : view} setView={(v) => { setView(v); setAdicionando(null); setProcessoAberto(null); }} counts={counts} user={user} onLogout={logout} isSuperAdmin={isSuperAdmin} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingTop: mobile ? 52 : 0 }}>
        {erroSB && (
          <div style={{ background: 'rgba(239,68,68,.08)', borderBottom: '1px solid rgba(239,68,68,.2)', padding: '8px 20px', fontSize: 12, color: 'var(--red)', display: 'flex', gap: 10, alignItems: 'center' }}>
            ⚠️ Supabase offline — usando dados locais. {erroSB}
            <button className="btn-ghost" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={carregarDados}>Reconectar</button>
          </div>
        )}

        {/* Form e detalhe — montados sob demanda */}
        {adicionando && <ProcessoForm onSave={addProcesso} onCancel={() => setAdicionando(null)} processo={null} />}
        {!adicionando && view === 'detalhe' && processoAberto && (
          <ProcessoDetalhe processo={processoAberto} onUpdate={updateProcesso} onDelete={delProcesso} onBack={() => { setView(processoAberto.tipo === 'juridico' ? 'juridico' : 'adm'); setProcessoAberto(null); }} user={user} />
        )}

        {/* Páginas principais — sempre montadas, escondidas via CSS para preservar estado */}
        <div style={css('dashboard')}><Dashboard processos={processos} setView={setView} setProcessoAberto={(p) => { marcarVisitado(p.id); setProcessoAberto(p); }} /></div>
        <div style={css('juridico')}><ProcessoList processos={processos} tipo="juridico" visitados={visitados} setProcessoAberto={(p) => { marcarVisitado(p.id); setProcessoAberto(p); }} setView={setView} onAdd={() => setAdicionando('juridico')} onImportDJE={() => setShowDJE(true)} onImportTexto={() => setShowTexto(true)} /></div>
        <div style={css('adm')}><ProcessoList processos={processos} tipo="administrativo" visitados={visitados} setProcessoAberto={(p) => { marcarVisitado(p.id); setProcessoAberto(p); }} setView={setView} onAdd={() => setAdicionando('administrativo')} onImportDJE={() => setShowDJE(true)} onImportTexto={() => setShowTexto(true)} /></div>
        <div style={css('agenda')}><Agenda processos={processos} setProcessoAberto={(p) => { marcarVisitado(p.id); setProcessoAberto(p); }} setView={setView} /></div>

        {/* Páginas admin — montadas sob demanda */}
        {mostrarPersistente && view === 'usuarios' && (isSuperAdmin
          ? <Usuarios sbClient={sbClient} userAtual={user} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
              <div style={{ fontSize: 40 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Acesso restrito a Super Admins</div>
            </div>
        )}
        {mostrarPersistente && view === 'config' && <Configuracoes config={config} onSave={saveConfig} onMigrar={migrarLocalParaSB} supabaseOk={!!sbClient && !erroSB} erroSB={erroSB} />}
        {mostrarPersistente && view === 'acessos' && user?.email === 'danilo@dbmachado.com' && <AcessoLog sbClient={sbClient} user={user} />}
      </div>
      {showTexto && (
        <ModalTexto
          processos={processos}
          claudeKey={config.claudeKey}
          onFechar={() => setShowTexto(false)}
          onSalvar={async (proc) => {
            await addProcesso(proc);
          }}
        />
      )}
      {showDJE && (
        <ModalDJE
          claudeKey={config.claudeKey}
          processos={processos}
          onFechar={() => setShowDJE(false)}
          onSalvar={async ({ tipo, processo }) => {
            if (tipo === 'criar') await addProcesso(processo);
            else await updateProcesso(processo);
          }}
          onConcluido={(ultimo) => {
            setShowDJE(false);
            if (ultimo) { setProcessoAberto(ultimo); setView('detalhe'); }
          }}
        />
      )}
    </>
  );
}
