-- ============================================================
-- Sistema Jurídico — DB Machado
-- Supabase: giendnvcmkaqdminmeyz.supabase.co
-- Atualizado: 2026-06
-- ============================================================
-- ATENÇÃO: as tabelas d_auth_user, d_auth_roles, d_auth_contratos
-- e audit_log já existem no projeto e NÃO são criadas aqui.
-- ============================================================


-- ─── LIMPEZA (rodar só se precisar recriar do zero) ──────────────────────────
-- DROP POLICY IF EXISTS "acesso_por_permissao"  ON jud_processos;
-- DROP POLICY IF EXISTS "acesso_via_processo"    ON jud_partes;
-- DROP POLICY IF EXISTS "acesso_via_processo"    ON jud_audiencias;
-- DROP POLICY IF EXISTS "acesso_via_processo"    ON jud_notas;
-- DROP POLICY IF EXISTS "acesso_via_processo"    ON jud_movimentacoes;
-- DROP POLICY IF EXISTS "acesso_via_processo"    ON jud_arquivos;
-- DROP POLICY IF EXISTS "ver_propria_permissao"  ON jud_user_permissoes;
-- DROP POLICY IF EXISTS "admin_acesso_total"     ON jud_user_permissoes;
-- DROP FUNCTION IF EXISTS jud_pode_ver_processo(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS jud_pode_ver_por_processo(UUID);
-- DROP TABLE IF EXISTS jud_arquivos;
-- DROP TABLE IF EXISTS jud_movimentacoes;
-- DROP TABLE IF EXISTS jud_notas;
-- DROP TABLE IF EXISTS jud_audiencias;
-- DROP TABLE IF EXISTS jud_partes;
-- DROP TABLE IF EXISTS jud_user_permissoes;
-- DROP TABLE IF EXISTS jud_processos;


-- ─── TABELAS ──────────────────────────────────────────────────────────────────

-- Processo judicial principal
CREATE TABLE jud_processos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero     TEXT        NOT NULL,
  tipo       TEXT        NOT NULL CHECK (tipo IN ('juridico', 'administrativo')),
  fase       TEXT        NOT NULL CHECK (fase IN ('Conhecimento', 'Execução', 'Arquivado')),
  parte      TEXT,                      -- parte principal / polo ativo (resumo)
  tribunal   TEXT,                      -- ex: TJGO, TRT18, Adm
  tramitacao TEXT,                      -- vara ou órgão julgador
  assuntos         TEXT[]      DEFAULT '{}',  -- ex: ['Rescisão Indireta', 'Horas Extras']
  valor_causa      NUMERIC,                   -- valor da causa em reais
  data_ajuizamento DATE,                      -- data em que a ação foi proposta
  uf               CHAR(2),                   -- estado (ex: GO, SP, MT)
  instancia        TEXT,                      -- ex: Primeiro Grau, Segundo Grau
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Se a tabela já existir, rode apenas:
-- ALTER TABLE jud_processos ADD COLUMN IF NOT EXISTS valor_causa NUMERIC;
-- ALTER TABLE jud_processos ADD COLUMN IF NOT EXISTS data_ajuizamento DATE;
-- ALTER TABLE jud_processos ADD COLUMN IF NOT EXISTS uf CHAR(2);
-- ALTER TABLE jud_processos ADD COLUMN IF NOT EXISTS instancia TEXT;

-- Partes do processo (polo ativo e passivo, com CPF/CNPJ)
CREATE TABLE jud_partes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  documento   TEXT,                     -- CPF ou CNPJ (sem formatação)
  polo        TEXT NOT NULL CHECK (polo IN ('ativo', 'passivo', 'outro')),
  tipo_pessoa TEXT CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audiências agendadas
CREATE TABLE jud_audiencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  data        DATE NOT NULL,
  hora        TIME,
  tipo        TEXT,                     -- Audiência Inicial, Instrução, Conciliação...
  local       TEXT,                     -- Presencial ou link de videoconferência
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Observações manuais dos usuários
CREATE TABLE jud_notas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  autor       TEXT DEFAULT 'Usuário',   -- nome extraído do e-mail do usuário logado
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Movimentações processuais (Log de Auditoria, andamentos do sistema)
-- Separado de jud_notas para não misturar com observações manuais
CREATE TABLE jud_movimentacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  data        DATE,
  hora        TEXT,                     -- HH:MM
  evento      TEXT NOT NULL,            -- ex: COMUNICAÇÃO DISPONIBILIZADA, Ciencia
  origem      TEXT,                     -- ex: service-account-pje-trt18-1g
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Arquivos anexados ao processo
-- Novos arquivos: url_externa aponta para Supabase Storage (bucket: juridico)
-- Arquivos legados: base64 (mantido para retrocompatibilidade)
CREATE TABLE jud_arquivos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id        UUID NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  nome               TEXT NOT NULL,
  tipo               TEXT,             -- MIME type (image/jpeg, application/pdf, link)
  tamanho            INTEGER,          -- bytes originais
  tamanho_comprimido INTEGER,          -- bytes após compressão (legado)
  base64             TEXT,             -- conteúdo em base64 (legado — novos usam Storage)
  url_externa        TEXT,             -- URL pública do Supabase Storage ou link externo
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Permissões jurídicas por usuário
-- Vincula ao d_auth_user existente
-- tipos: ['trabalhista', 'civel', 'administrativo']
CREATE TABLE jud_user_permissoes (
  user_uuid  UUID    PRIMARY KEY REFERENCES d_auth_user(uuid) ON DELETE CASCADE,
  tipos      TEXT[]  DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE jud_processos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_partes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_audiencias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_notas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_arquivos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_user_permissoes ENABLE ROW LEVEL SECURITY;


-- ─── FUNÇÕES AUXILIARES ───────────────────────────────────────────────────────

-- Verifica se o usuário logado pode acessar um processo dado tipo e tribunal.
-- Regras:
--   Super Admin (d_auth_user.is_super_admin)  → acesso total
--   tipo=juridico + tribunal ILIKE 'TRT%'     → requer permissão 'trabalhista'
--   tipo=juridico + tribunal NOT ILIKE 'TRT%' → requer permissão 'civel'
--   tipo=administrativo                        → requer permissão 'administrativo'
CREATE OR REPLACE FUNCTION jud_pode_ver_processo(p_tipo TEXT, p_tribunal TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM d_auth_user
      WHERE uuid = auth.uid() AND is_super_admin = TRUE
    )
    OR (
      p_tipo = 'juridico' AND p_tribunal ILIKE 'TRT%'
      AND EXISTS (
        SELECT 1 FROM jud_user_permissoes
        WHERE user_uuid = auth.uid() AND 'trabalhista' = ANY(tipos)
      )
    )
    OR (
      p_tipo = 'juridico' AND p_tribunal NOT ILIKE 'TRT%'
      AND EXISTS (
        SELECT 1 FROM jud_user_permissoes
        WHERE user_uuid = auth.uid() AND 'civel' = ANY(tipos)
      )
    )
    OR (
      p_tipo = 'administrativo'
      AND EXISTS (
        SELECT 1 FROM jud_user_permissoes
        WHERE user_uuid = auth.uid() AND 'administrativo' = ANY(tipos)
      )
    )
  );
$$;

-- Verifica acesso a um processo pelo seu ID (usado pelas tabelas filhas)
CREATE OR REPLACE FUNCTION jud_pode_ver_por_processo(p_processo_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM jud_processos
    WHERE id = p_processo_id
      AND jud_pode_ver_processo(tipo, tribunal)
  );
$$;


-- ─── POLÍTICAS RLS ────────────────────────────────────────────────────────────

-- jud_processos: filtra por tipo/tribunal conforme permissões
CREATE POLICY "acesso_por_permissao" ON jud_processos
  FOR ALL TO authenticated
  USING  (jud_pode_ver_processo(tipo, tribunal))
  WITH CHECK (jud_pode_ver_processo(tipo, tribunal));

-- Tabelas filhas: herdam acesso do processo pai
CREATE POLICY "acesso_via_processo" ON jud_partes
  FOR ALL TO authenticated
  USING  (jud_pode_ver_por_processo(processo_id))
  WITH CHECK (jud_pode_ver_por_processo(processo_id));

CREATE POLICY "acesso_via_processo" ON jud_audiencias
  FOR ALL TO authenticated
  USING  (jud_pode_ver_por_processo(processo_id))
  WITH CHECK (jud_pode_ver_por_processo(processo_id));

CREATE POLICY "acesso_via_processo" ON jud_notas
  FOR ALL TO authenticated
  USING  (jud_pode_ver_por_processo(processo_id))
  WITH CHECK (jud_pode_ver_por_processo(processo_id));

CREATE POLICY "acesso_via_processo" ON jud_movimentacoes
  FOR ALL TO authenticated
  USING  (jud_pode_ver_por_processo(processo_id))
  WITH CHECK (jud_pode_ver_por_processo(processo_id));

CREATE POLICY "acesso_via_processo" ON jud_arquivos
  FOR ALL TO authenticated
  USING  (jud_pode_ver_por_processo(processo_id))
  WITH CHECK (jud_pode_ver_por_processo(processo_id));

-- jud_user_permissoes:
--   Usuário comum vê apenas sua própria linha (para saber suas permissões)
--   Super Admin pode ler e modificar tudo (gestão de usuários)
CREATE POLICY "ver_propria_permissao" ON jud_user_permissoes
  FOR SELECT TO authenticated
  USING (user_uuid = auth.uid());

CREATE POLICY "admin_acesso_total" ON jud_user_permissoes
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM d_auth_user WHERE uuid = auth.uid() AND is_super_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM d_auth_user WHERE uuid = auth.uid() AND is_super_admin = TRUE));


-- Rastreia quais processos cada usuário já visualizou
CREATE TABLE jud_processos_vistos (
  user_uuid   UUID NOT NULL REFERENCES d_auth_user(uuid) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  visto_em    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_uuid, processo_id)
);
ALTER TABLE jud_processos_vistos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proprio_usuario" ON jud_processos_vistos
  FOR ALL TO authenticated
  USING (user_uuid = auth.uid())
  WITH CHECK (user_uuid = auth.uid());

-- ─── SUPABASE STORAGE ─────────────────────────────────────────────────────────
-- Criar manualmente no painel Supabase → Storage → New bucket:
--   Nome: juridico
--   Tipo: Public
--   Caminho dos arquivos: processos/{processo_id}/{uuid}.{ext}
--   Imagens são comprimidas antes do upload (JPEG 75%, max 1920px)


-- ─── STORED PROCEDURES (já existem no Supabase) ──────────────────────────────
-- Usadas via sbClient.rpc() — NÃO recriar se já existirem.
--
-- criar_usuario_auth(p_email, p_password, p_nome, p_role_id)
--   Cria em auth.users + auth.identities + d_auth_user atomicamente
--   Retorna UUID do novo usuário
--
-- alterar_senha_usuario(p_uuid, p_senha)
--   Atualiza encrypted_password em auth.users
--
-- deletar_usuario_auth(p_uuid)
--   Remove de d_auth_contratos, d_auth_user, auth.identities, auth.users em cascata


-- ─── REFERÊNCIA DE TIPOS ──────────────────────────────────────────────────────
--
-- jud_processos.tipo:
--   'juridico'       → processos judiciais (TJ ou TRT)
--   'administrativo' → processos administrativos (Adm, SRTE, MPT...)
--
-- jud_processos.fase:
--   'Conhecimento'   → em andamento, sem decisão final
--   'Execução'       → em fase de cobrança/cumprimento
--   'Arquivado'      → encerrado
--
-- jud_user_permissoes.tipos[]:
--   'trabalhista'    → vê processos com tribunal ILIKE 'TRT%'
--   'civel'          → vê processos juridico com tribunal não TRT
--   'administrativo' → vê processos com tipo = 'administrativo'
