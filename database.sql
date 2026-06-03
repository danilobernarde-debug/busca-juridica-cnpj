-- ============================================================
-- Sistema Jurídico — DB Machado
-- Schema completo: tabelas + RLS
-- Supabase: giendnvcmkaqdminmeyz.supabase.co
-- ============================================================

-- ─── LIMPEZA (rodar só se precisar recriar do zero) ──────────
-- DROP TABLE IF EXISTS jud_arquivos;
-- DROP TABLE IF EXISTS jud_notas;
-- DROP TABLE IF EXISTS jud_audiencias;
-- DROP TABLE IF EXISTS jud_partes;
-- DROP TABLE IF EXISTS jud_processos;


-- ─── TABELAS ─────────────────────────────────────────────────

CREATE TABLE jud_processos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero     TEXT        NOT NULL,
  tipo       TEXT        NOT NULL CHECK (tipo IN ('juridico', 'administrativo')),
  fase       TEXT        NOT NULL CHECK (fase IN ('Conhecimento', 'Execução', 'Arquivado')),
  parte      TEXT,                        -- parte principal (resumo)
  tribunal   TEXT,
  tramitacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partes do processo (polo ativo e passivo, com documento)
-- Permite múltiplas partes em qualquer polo
CREATE TABLE jud_partes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID        NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  documento   TEXT,                        -- CPF ou CNPJ
  polo        TEXT        NOT NULL CHECK (polo IN ('ativo', 'passivo', 'outro')),
  tipo_pessoa TEXT        CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jud_audiencias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID        NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  data        DATE        NOT NULL,
  hora        TIME,
  tipo        TEXT,
  local       TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jud_notas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID        NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  texto       TEXT        NOT NULL,
  autor       TEXT        DEFAULT 'Usuário',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Arquivos anexados — conteúdo em base64 ou link externo
CREATE TABLE jud_arquivos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id        UUID        NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  nome               TEXT        NOT NULL,
  tipo               TEXT,                  -- MIME type
  tamanho            INTEGER,               -- bytes original
  tamanho_comprimido INTEGER,               -- bytes após compressão gzip
  base64             TEXT,                  -- conteúdo do arquivo em base64
  url_externa        TEXT,                  -- link externo (SharePoint, OneDrive...)
  created_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE jud_processos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_partes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_notas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jud_arquivos   ENABLE ROW LEVEL SECURITY;

-- Política atual: qualquer usuário autenticado acessa tudo
-- Para restringir por usuário no futuro: adicionar coluna user_id
-- e trocar USING (true) por USING (auth.uid() = user_id)

CREATE POLICY "acesso_autenticado" ON jud_processos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_autenticado" ON jud_partes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_autenticado" ON jud_audiencias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_autenticado" ON jud_notas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acesso_autenticado" ON jud_arquivos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─── FUTURO: CONTROLE POR USUÁRIO ────────────────────────────
-- Quando precisar separar o que cada usuário pode ver:
--
-- 1. Adicionar coluna em jud_processos:
--    ALTER TABLE jud_processos ADD COLUMN user_id UUID REFERENCES auth.users(id);
--
-- 2. Trocar a policy:
--    DROP POLICY "acesso_autenticado" ON jud_processos;
--    CREATE POLICY "acesso_proprio" ON jud_processos
--      FOR ALL TO authenticated
--      USING (auth.uid() = user_id)
--      WITH CHECK (auth.uid() = user_id);
--
-- 3. Preencher user_id nos registros existentes:
--    UPDATE jud_processos SET user_id = '<uuid-do-usuario>' WHERE user_id IS NULL;
