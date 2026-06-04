function parseUA(ua) {
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' :
    /OPR\/|Opera/.test(ua) ? 'Opera' : 'Outro';

  const os =
    /Windows NT 10/.test(ua) ? 'Windows 10/11' :
    /Windows NT 6\.3/.test(ua) ? 'Windows 8.1' :
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Linux/.test(ua) ? 'Linux' : 'Outro';

  const dispositivo = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop';

  return { browser, os, dispositivo };
}

export async function registrarAcesso(sbClient, user, nome) {
  if (!sbClient || !user) return;
  try {
    const { browser, os, dispositivo } = parseUA(navigator.userAgent);

    let ip = '', cidade = '', regiao = '', pais = '';
    try {
      const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
      ip = geo.ip || '';
      cidade = geo.city || '';
      regiao = geo.region || '';
      pais = geo.country_name || '';
    } catch {}

    await sbClient.from('jud_access_log').insert({
      user_uuid: user.id,
      user_email: user.email,
      user_nome: nome || user.email?.split('@')[0] || '',
      ip, cidade, regiao, pais,
      navegador: browser,
      sistema_op: os,
      dispositivo,
    });
  } catch {}
}

export async function carregarLogs(sbClient, limite = 200) {
  const { data } = await sbClient
    .from('jud_access_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite);
  return data || [];
}
