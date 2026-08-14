-- ============================================================
-- Migração: notificações de novas movimentações (sync DataJud)
-- Rodar uma vez no SQL Editor do Supabase.
-- Depende das tabelas/funções já existentes em database.sql
-- (jud_processos, jud_movimentacoes, jud_pode_ver_por_processo).
-- ============================================================

CREATE TABLE jud_notificacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id     UUID NOT NULL REFERENCES jud_processos(id) ON DELETE CASCADE,
  movimentacao_id UUID REFERENCES jud_movimentacoes(id) ON DELETE CASCADE,
  mensagem        TEXT NOT NULL,
  lida            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jud_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_via_processo" ON jud_notificacoes
  FOR ALL TO authenticated
  USING  (jud_pode_ver_por_processo(processo_id))
  WITH CHECK (jud_pode_ver_por_processo(processo_id));
