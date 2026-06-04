import { useState } from 'react';
import { sbClient } from '../lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    if (!email || !senha) return;
    setLoading(true);
    setErro('');
    const { error } = await sbClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro('E-mail ou senha incorretos.');
      setLoading(false);
    }
    // Se ok, onAuthStateChange no App cuida do resto
  };

  return (
    <div style={{ flex: 1, width: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>DB Machado</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Sistema Jurídico Interno</div>
        </div>

        <form onSubmit={entrar} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" autoFocus autoComplete="email" />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" />
          </div>

          {erro && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13 }}>
              {erro}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || !email || !senha}
            style={{ padding: '12px', fontSize: 15, marginTop: 4 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--muted)' }}>
          Acesso restrito. Para criar conta fale com o administrador.
        </div>
      </div>
    </div>
  );
}
