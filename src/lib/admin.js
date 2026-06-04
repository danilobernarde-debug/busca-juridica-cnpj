export async function listarUsuarios(sbClient) {
  const { data: usuarios, error } = await sbClient
    .from('d_auth_user')
    .select('uuid, nome, email, is_super_admin, foto_url, role_id')
    .order('nome', { ascending: true });
  if (error) throw error;

  const { data: perms } = await sbClient.from('jud_user_permissoes').select('*');
  const permsMap = Object.fromEntries((perms || []).map(p => [p.user_uuid, p]));

  return (usuarios || []).map(u => ({
    uuid: u.uuid,
    nome: u.nome || '',
    email: u.email,
    is_super_admin: u.is_super_admin || false,
    foto_url: u.foto_url || null,
    role_id: u.role_id,
    tipos: permsMap[u.uuid]?.tipos || [],
  }));
}

export async function listarRoles(sbClient) {
  const { data } = await sbClient.from('d_auth_roles').select('id, nome').order('id');
  return data || [];
}

export async function criarUsuario(sbClient, { email, nome, senha, roleId, tipos }) {
  // Chama a stored procedure — já cria auth.users + auth.identities + d_auth_user atomicamente
  const { data: newUuid, error } = await sbClient.rpc('criar_usuario_auth', {
    p_email: email,
    p_password: senha,
    p_nome: nome || email.split('@')[0],
    p_role_id: Number(roleId),
  });
  if (error) throw new Error(error.message);

  // Salva permissões jurídicas (se houver)
  if (tipos?.length > 0) {
    const { error: permError } = await sbClient.from('jud_user_permissoes').insert({
      user_uuid: newUuid,
      tipos,
    });
    if (permError) {
      // Usuário criado com sucesso — permissões podem ser configuradas depois
      console.warn('Permissões não salvas:', permError.message);
    }
  }

  return newUuid;
}

export async function alterarSenha(sbClient, userUuid, novaSenha) {
  const { error } = await sbClient.rpc('alterar_senha_usuario', {
    p_uuid: userUuid,
    p_senha: novaSenha,
  });
  if (error) throw new Error(error.message);
}

export async function salvarPermissoes(sbClient, userUuid, tipos) {
  const { error } = await sbClient
    .from('jud_user_permissoes')
    .upsert({ user_uuid: userUuid, tipos }, { onConflict: 'user_uuid' });
  if (error) throw error;
}

export async function deletarUsuario(sbClient, userUuid) {
  // Stored procedure remove de todas as tabelas em ordem correta
  const { error } = await sbClient.rpc('deletar_usuario_auth', { p_uuid: userUuid });
  if (error) throw new Error(error.message);
}
