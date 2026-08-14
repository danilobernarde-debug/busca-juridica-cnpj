import { useState, useEffect } from 'react';
import { listarUsuarios, listarRoles, criarUsuario, alterarSenha, salvarPermissoes, deletarUsuario } from '../lib/admin.js';

const TIPOS = [
  { id: 'trabalhista',    label: 'Trabalhista',    icon: '👷', color: '#4f46e5', desc: 'Processos TRT (Trabalho)' },
  { id: 'civel',          label: 'Cível',          icon: '🏛️', color: '#0891b2', desc: 'Processos TJ (Cível)' },
  { id: 'administrativo', label: 'Administrativo', icon: '📋', color: '#f97316', desc: 'Processos administrativos' },
];

const FORM_VAZIO = { email: '', nome: '', senha: '', tipos: [] };

export default function Usuarios({ sbClient, userAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Criação
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // Permissões
  const [editandoPerm, setEditandoPerm] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [salvandoPerm, setSalvandoPerm] = useState(false);

  // Alterar senha
  const [editandoSenha, setEditandoSenha] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setCarregando(true);
    try {
      const [u, r] = await Promise.all([listarUsuarios(sbClient), listarRoles(sbClient)]);
      setUsuarios(u);
      setRoles(r);
      setErro('');

    } catch (e) {
      setErro('Erro ao carregar: ' + e.message);
    } finally {
      setCarregando(false);
    }
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTipoCriacao = (tipo) =>
    setForm(f => ({ ...f, tipos: f.tipos.includes(tipo) ? f.tipos.filter(t => t !== tipo) : [...f.tipos, tipo] }));

  const salvarNovo = async () => {
    if (!form.email.trim() || !form.senha) return;
    if (form.senha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres.'); return; }
    setSalvando(true);
    setErro('');
    try {
      await criarUsuario(sbClient, {
        email: form.email.trim().toLowerCase(),
        nome: form.nome.trim(),
        senha: form.senha,
        roleId: roles[0]?.id ?? 1,
        tipos: form.tipos,
      });
      setForm({ ...FORM_VAZIO, roleId: roles[0]?.id || '' });
      setCriando(false);
      await carregar();
    } catch (e) {
      setErro('Erro ao criar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const salvarPerm = async () => {
    setSalvandoPerm(true);
    try {
      await salvarPermissoes(sbClient, editandoPerm.uuid, tipos);
      await carregar();
      setEditandoPerm(null);
    } catch (e) {
      setErro('Erro ao salvar permissões: ' + e.message);
    } finally {
      setSalvandoPerm(false);
    }
  };

  const salvarSenha = async () => {
    if (novaSenha.length < 6) { setErro('Mínimo 6 caracteres.'); return; }
    setSalvandoSenha(true);
    setErro('');
    try {
      await alterarSenha(sbClient, editandoSenha.uuid, novaSenha);
      setEditandoSenha(null);
      setNovaSenha('');
    } catch (e) {
      setErro('Erro ao alterar senha: ' + e.message);
    } finally {
      setSalvandoSenha(false);
    }
  };

  const excluir = async (u) => {
    if (!confirm(`Excluir ${u.email}?\n\nEsta ação remove o usuário de todas as tabelas e não pode ser desfeita.`)) return;
    setErro('');
    try {
      await deletarUsuario(sbClient, u.uuid);
      await carregar();
    } catch (e) {
      setErro('Erro ao excluir: ' + e.message);
    }
  };

  return (
    <div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>👥 Usuários</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{usuarios.length} usuário(s)</div>
        </div>
        {!criando && (
          <button className="btn-primary" onClick={() => { setCriando(true); setForm({ ...FORM_VAZIO, roleId: roles[0]?.id || '' }); }}>
            + Novo usuário
          </button>
        )}
      </div>

      {erro && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {/* Formulário criar usuário */}
      {criando && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>+ Novo usuário</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field">
              <label>E-mail *</label>
              <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="usuario@empresa.com" autoFocus autoComplete="off" />
            </div>
            <div className="field">
              <label>Nome</label>
              <input value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Nome completo" autoComplete="off" />
            </div>
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Senha *</label>
              <input type="password" value={form.senha} onChange={e => setF('senha', e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 10 }}>Permissões jurídicas</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {TIPOS.map(t => {
                const ativo = form.tipos.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleTipoCriacao(t.id)} style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: ativo ? `1px solid ${t.color}` : '1px solid var(--border)',
                    background: ativo ? `${t.color}15` : 'var(--surface2)',
                  }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{t.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: ativo ? t.color : 'var(--text)' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setCriando(false); setErro(''); }}>Cancelar</button>
            <button className="btn-primary" onClick={salvarNovo} disabled={salvando || !form.email.trim() || !form.senha}>
              {salvando ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </div>
      )}

      {/* Modal — Permissões */}
      {editandoPerm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 400 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🔑 Permissões</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{editandoPerm.nome || editandoPerm.email}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {TIPOS.map(t => {
                const ativo = tipos.includes(t.id);
                return (
                  <button key={t.id} onClick={() => setTipos(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: ativo ? `1px solid ${t.color}` : '1px solid var(--border)', background: ativo ? `${t.color}15` : 'var(--surface2)' }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: ativo ? t.color : 'var(--text)' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.desc}</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${ativo ? t.color : 'var(--border)'}`, background: ativo ? t.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>
                      {ativo ? '✓' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setEditandoPerm(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarPerm} disabled={salvandoPerm}>{salvandoPerm ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Alterar senha */}
      {editandoSenha && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 360 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🔒 Alterar senha</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{editandoSenha.nome || editandoSenha.email}</div>
            <div className="field" style={{ marginBottom: 20 }}>
              <label>Nova senha *</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setEditandoSenha(null); setNovaSenha(''); }}>Cancelar</button>
              <button className="btn-primary" onClick={salvarSenha} disabled={salvandoSenha || novaSenha.length < 6}>{salvandoSenha ? 'Salvando...' : 'Alterar senha'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {carregando ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Carregando...</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {['Usuário', 'Permissões', 'Ações'].map(h =>
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum usuário.</td></tr>
              ) : usuarios.map(u => (
                <tr key={u.uuid} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.foto_url
                        ? <img src={u.foto_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--muted)', fontWeight: 700 }}>
                            {(u.nome || u.email)[0].toUpperCase()}
                          </div>
                      }
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {u.nome || u.email.split('@')[0]}
                          {u.is_super_admin && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(245,158,11,.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)', fontWeight: 700 }}>⭐ Super Admin</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(u.tipos || []).length === 0
                        ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sem acesso</span>
                        : (u.tipos || []).map(tipo => {
                            const t = TIPOS.find(x => x.id === tipo);
                            return t ? (
                              <span key={tipo} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}40`, fontWeight: 700 }}>
                                {t.icon} {t.label}
                              </span>
                            ) : null;
                          })
                      }
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-secondary" onClick={() => { setEditandoPerm(u); setTipos(u.tipos || []); }} style={{ padding: '5px 12px', fontSize: 12 }}>🔑 Permissões</button>
                      <button className="btn-secondary" onClick={() => { setEditandoSenha(u); setNovaSenha(''); }} style={{ padding: '5px 12px', fontSize: 12 }}>🔒 Senha</button>
                      {u.email !== userAtual?.email && (
                        <button className="btn-danger" onClick={() => excluir(u)} style={{ padding: '5px 12px', fontSize: 12 }}>🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
