import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMobile, normalizar } from './lib/utils.js';
import { sbClient, sb_carregar, sb_salvar, sb_deletar, sb_migrar, sb_carregarVistos, sb_marcarVisto, sb_marcarTodosVistos, sb_carregarNotificacoes, sb_marcarNotificacaoLida, sb_marcarTodasNotificacoesLidas } from './lib/supabase.js';
import { loadData, saveData } from './lib/storage.js';
import Sidebar from './components/Sidebar.jsx';
import ProcessoForm from './components/ProcessoForm.jsx';
import ModalDJE from './components/ModalDJE.jsx';
import ModalTexto from './components/ModalTexto.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProcessoList from './pages/ProcessoList.jsx';
import Agenda from './pages/Agenda.jsx';
import Movimentacoes from './pages/Movimentacoes.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import AcessoLog from './pages/AcessoLog.jsx';
import { registrarAcesso } from './lib/accessLog.js';
import ProcessoDetalhe from './pages/ProcessoDetalhe/index.jsx';

// ─── WRAPPERS DE ROTA ─────────────────────────────────────────────────────────

function ProcessoDetalhePorId({ processos, carregando, onUpdate, onDelete, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  if (carregando) return null;
  const processo = processos.find(p => String(p.id) === id);
  if (!processo) return <Navigate to="/" replace />;
  return (
    <ProcessoDetalhe
      processo={processo}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onBack={() => navigate(processo.tipo === 'juridico' ? '/juridico' : '/adm')}
      user={user}
    />
  );
}

function NovoProcesso({ onSave }) {
  const { tipo } = useParams();
  const navigate = useNavigate();
  return (
    <ProcessoForm
      onSave={onSave}
      onCancel={() => navigate(tipo === 'adm' ? '/adm' : '/juridico')}
      processo={null}
    />
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const mobile = useMobile();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [processos, setProcessos] = useState([]);
  const [config, setConfig] = useState({ claudeKey: import.meta.env.VITE_CLAUDE_KEY || '' });
  const [carregando, setCarregando] = useState(true);
  const jaCarregouRef = useRef(false);
  const [erroSB, setErroSB] = useState(null);
  const [showDJE, setShowDJE] = useState(false);
  const [showTexto, setShowTexto] = useState(false);
  const [visitados, setVisitados] = useState(new Set());
  const [notificacoes, setNotificacoes] = useState([]);

  const marcarVisitado = (id) => {
    if (visitados.has(id)) return;
    setVisitados(prev => { const n = new Set(prev); n.add(id); return n; });
    if (user) sb_marcarVisto(user.id, id);
  };

  const marcarTudoVisto = useCallback(async (ids) => {
    const novos = ids.filter(id => !visitados.has(id));
    if (!novos.length) return;
    setVisitados(prev => { const n = new Set(prev); novos.forEach(id => n.add(id)); return n; });
    if (user) await sb_marcarTodosVistos(user.id, novos);
  }, [visitados, user]);

  const abrirNotificacao = useCallback((n) => {
    sb_marcarNotificacaoLida(n.id);
    setNotificacoes(prev => prev.filter(x => x.id !== n.id));
    marcarVisitado(n.processo_id);
    navigate(`/processo/${n.processo_id}`);
  }, [navigate]);

  const marcarTodasNotificacoesLidas = useCallback(() => {
    const ids = notificacoes.map(n => n.id);
    setNotificacoes([]);
    sb_marcarTodasNotificacoesLidas(ids);
  }, [notificacoes]);

  // Navega para o detalhe do processo e marca como visitado
  const abrirProcesso = useCallback((p) => {
    marcarVisitado(p.id);
    navigate(`/processo/${p.id}`);
  }, [visitados, user, navigate]);

  // Compatibilidade: filhos que ainda chamam setView('juridico') etc.
  const legacySetView = useCallback((v) => {
    const paths = { dashboard: '/', juridico: '/juridico', adm: '/adm', agenda: '/agenda' };
    if (v in paths) navigate(paths[v]);
    // 'detalhe' ignorado — abrirProcesso já navega
  }, [navigate]);

  useEffect(() => {
    if (!sbClient) {
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

    sbClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        carregarPerfil(session.user.id);
        carregarDados(false, session.user.id);
      } else {
        setCarregando(false);
      }
    });

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
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Notificações de novas movimentações (sincronização automática com o DataJud)
  useEffect(() => {
    if (!sbClient || !user) return;
    const carregar = () => sb_carregarNotificacoes().then(setNotificacoes).catch(() => {});
    carregar();
    const intervalo = setInterval(carregar, 3 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [user]);

  const carregarDados = async (silencioso = false, userId = null) => {
    if (!silencioso) setCarregando(true);
    try {
      const dados = await sb_carregar();
      setProcessos(dados);
      setErroSB(null);
      jaCarregouRef.current = true;
    } catch (e) {
      console.error('Supabase:', e);
      setErroSB(e.message);
    } finally {
      if (!silencioso) setCarregando(false);
    }
    if (userId) {
      sb_carregarVistos(userId).then(setVisitados).catch(() => {});
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
    if (sbClient) await salvarSB(proc);
    else saveData({ processos: processos.map(p => p.id === proc.id ? proc : p), config });
  }, [processos, config]);

  const addProcesso = useCallback(async (proc) => {
    const duplicado = proc.numero && processos.find(p =>
      p.id !== proc.id && normalizar(p.numero) === normalizar(proc.numero)
    );

    if (duplicado) {
      const confirmar = confirm(
        `O processo ${proc.numero} já está cadastrado.\n\nDeseja atualizar os dados existentes?`
      );
      if (!confirmar) return false;

      // Partes: mantém todas do antigo, adiciona novas que não existem pelo nome
      const nomesExistentes = new Set((duplicado.partes || []).map(p => (p.nome || '').toLowerCase()));
      const partesNovas = (proc.partes || []).filter(p => !nomesExistentes.has((p.nome || '').toLowerCase()));
      const partesMerged = [...(duplicado.partes || []), ...partesNovas];

      // Movimentações: mantém todas do antigo, adiciona novas que não existem por data+evento
      const movChave = m => `${m.data}|${(m.evento || '').slice(0, 80)}`;
      const movExistentes = new Set((duplicado.movimentacoes || []).map(movChave));
      const movNovas = (proc.movimentacoes || []).filter(m => !movExistentes.has(movChave(m)));
      const movMerged = [...(duplicado.movimentacoes || []), ...movNovas];

      // Audiências: mantém todas do antigo, adiciona novas que não existem pela data
      const datasExistentes = new Set((duplicado.audiencias || []).map(a => a.data));
      const audNovas = (proc.audiencias || []).filter(a => !datasExistentes.has(a.data));
      const audMerged = [...(duplicado.audiencias || []), ...audNovas];

      // Assuntos: união sem duplicatas
      const assuntosMerged = [...new Set([...(duplicado.assuntos || []), ...(proc.assuntos || [])])];

      const atualizado = {
        ...duplicado,
        // Campos escalares: usa o novo se tiver valor, senão mantém o antigo
        numero:          proc.numero          || duplicado.numero,
        tipo:            proc.tipo            || duplicado.tipo,
        parte:           proc.parte           || duplicado.parte,
        tribunal:        proc.tribunal        || duplicado.tribunal,
        tramitacao:      proc.tramitacao      || duplicado.tramitacao,
        valorCausa:      proc.valorCausa      || duplicado.valorCausa,
        dataAjuizamento: proc.dataAjuizamento || duplicado.dataAjuizamento,
        uf:              proc.uf              || duplicado.uf,
        instancia:       proc.instancia       || duplicado.instancia,
        tipoDocumento:   proc.tipoDocumento   || duplicado.tipoDocumento,
        // Arrays mesclados
        partes:          partesMerged,
        movimentacoes:   movMerged,
        audiencias:      audMerged,
        assuntos:        assuntosMerged,
        // Sempre preserva do antigo
        fase:     duplicado.fase,
        notas:    duplicado.notas    || [],
        arquivos: duplicado.arquivos || [],
        // Identidade
        id:        duplicado.id,
        createdAt: duplicado.createdAt,
        updatedAt: new Date().toISOString(),
      };

      setProcessos(prev => prev.map(p => p.id === duplicado.id ? atualizado : p));
      if (sbClient) await salvarSB(atualizado);
      else saveData({ processos: processos.map(p => p.id === duplicado.id ? atualizado : p), config });
      navigate(`/processo/${duplicado.id}`);
      return;
    }

    const saved = sbClient ? (await salvarSB(proc) || proc) : proc;
    if (!sbClient) saveData({ processos: [proc, ...processos], config });
    setProcessos(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
    navigate(`/processo/${saved.id}`);
  }, [processos, config, navigate]);

  const removerProcesso = useCallback(async (id) => {
    if (sbClient) { try { await sb_deletar(id); } catch (e) { setErroSB('Erro ao deletar: ' + e.message); } }
    else saveData({ processos: processos.filter(p => p.id !== id), config });
    setProcessos(prev => prev.filter(p => p.id !== id));
  }, [processos, config]);

  const delProcesso = useCallback(async (id) => {
    await removerProcesso(id);
    navigate('/');
  }, [removerProcesso, navigate]);

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

  if (sbClient && !user && !carregando) return <Login />;

  if (carregando) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--muted)', minHeight: '100vh' }}>
      <div style={{ fontSize: 40 }}>⚖️</div>
      <div style={{ fontSize: 14 }}>Carregando{user ? ' dados' : ''}...</div>
    </div>
  );

  return (
    <>
      <Sidebar counts={counts} user={user} onLogout={logout} isSuperAdmin={isSuperAdmin}
        notificacoes={notificacoes} onAbrirNotificacao={abrirNotificacao} onMarcarTodasNotificacoesLidas={marcarTodasNotificacoesLidas} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingTop: mobile ? 52 : 0 }}>
        {erroSB && (
          <div style={{ background: 'rgba(239,68,68,.08)', borderBottom: '1px solid rgba(239,68,68,.2)', padding: '8px 20px', fontSize: 12, color: 'var(--red)', display: 'flex', gap: 10, alignItems: 'center' }}>
            ⚠️ Supabase offline — usando dados locais. {erroSB}
            <button className="btn-ghost" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={carregarDados}>Reconectar</button>
          </div>
        )}

        <Routes>
          <Route path="/" element={
            <Dashboard processos={processos} setView={legacySetView} setProcessoAberto={abrirProcesso} />
          } />
          <Route path="/juridico" element={
            <ProcessoList processos={processos} tipo="juridico" visitados={visitados}
              setProcessoAberto={abrirProcesso} setView={legacySetView}
              onAdd={() => navigate('/novo/juridico')}
              onImportDJE={() => setShowDJE(true)} onImportTexto={() => setShowTexto(true)}
              onMarcarTudoVisto={marcarTudoVisto} />
          } />
          <Route path="/adm" element={
            <ProcessoList processos={processos} tipo="administrativo" visitados={visitados}
              setProcessoAberto={abrirProcesso} setView={legacySetView}
              onAdd={() => navigate('/novo/adm')}
              onImportDJE={() => setShowDJE(true)} onImportTexto={() => setShowTexto(true)}
              onMarcarTudoVisto={marcarTudoVisto} />
          } />
          <Route path="/agenda" element={
            <Agenda processos={processos} setProcessoAberto={abrirProcesso} setView={legacySetView} />
          } />
          <Route path="/movimentacoes" element={
            <Movimentacoes processos={processos} setProcessoAberto={abrirProcesso} setView={legacySetView} />
          } />
          <Route path="/processo/:id" element={
            <ProcessoDetalhePorId processos={processos} carregando={carregando} onUpdate={updateProcesso} onDelete={delProcesso} user={user} />
          } />
          <Route path="/novo/:tipo" element={<NovoProcesso onSave={addProcesso} />} />
          <Route path="/usuarios" element={
            isSuperAdmin ? <Usuarios sbClient={sbClient} userAtual={user} /> : <Navigate to="/" replace />
          } />
          <Route path="/config" element={
            <Configuracoes config={config} onSave={saveConfig} onMigrar={migrarLocalParaSB} supabaseOk={!!sbClient && !erroSB} erroSB={erroSB} processos={processos} onDelete={removerProcesso} />
          } />
          <Route path="/acessos" element={
            user?.email === 'danilo@dbmachado.com' ? <AcessoLog sbClient={sbClient} user={user} /> : <Navigate to="/" replace />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showTexto && (
        <ModalTexto
          processos={processos}
          claudeKey={config.claudeKey}
          onFechar={() => setShowTexto(false)}
          onSalvar={async (proc) => {
            const resultado = await addProcesso(proc);
            return resultado !== false;
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
            if (ultimo) navigate(`/processo/${ultimo.id}`);
          }}
        />
      )}
    </>
  );
}
