# Sistema Jurídico — DB Machado

Sistema web para acompanhamento de processos jurídicos da **DB Machado / Rede Forte Construções**.

---

## Stack

- **Frontend:** React + Vite (`npm run dev` / `npm run build`)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **IA:** Anthropic API — Claude Haiku para parsing de texto, Claude Opus para PDFs escaneados
- **PDF:** pdfjs-dist para extração de texto e renderização como imagem
- **Autenticação:** Supabase Auth com `d_auth_user` customizado

---

## Estrutura de Arquivos

```
src/
  App.jsx                        ← estado global, roteamento, auth
  main.jsx
  index.css                      ← variáveis CSS, estilos globais
  constants/
    styles.js                    ← FASE_STYLE, TIPO_STYLE, NAV (sidebar)
  lib/
    supabase.js                  ← sbClient, sb_carregar, sb_salvar, sb_deletar, sb_migrar, sb_uploadArquivo, sb_deletarArquivoStorage
    storage.js                   ← loadData/saveData (fallback localStorage)
    admin.js                     ← listarUsuarios, listarRoles, criarUsuario, alterarSenha, salvarPermissoes, deletarUsuario (via RPC)
    pdf.js                       ← extrairTextoPDF, pdfParaImagens, extrairComIA, comprimirArquivo, processarUmArquivo, parsearDJE, parsearTXT
    parsearTexto.js              ← parsearTextoEstruturado (formato PJUD), extrairProcessoComIA (fallback IA)
    compress.js                  ← comprimirImagem (Canvas, JPEG 75%, max 1920px — igual WhatsApp)
    utils.js                     ← uid, now, fmtData, fmtDataHora, fmtTamanho
  components/
    Badge.jsx
    Card.jsx (não usado no sistema_juridico.html)
    Sidebar.jsx                  ← NAV filtrado por adminOnly + isSuperAdmin
    ProcessoForm.jsx             ← formulário add/edit processo
    ModalDJE.jsx                 ← importar PDF/TXT do DJE — extrai dados e cria/atualiza processo
    ModalTexto.jsx               ← colar texto estruturado (PJUD) ou qualquer texto (fallback IA)
  pages/
    Login.jsx
    Dashboard.jsx
    ProcessoList.jsx             ← tabela com paginação (40/página), filtros, botões Importar/Colar texto/Novo
    Agenda.jsx
    Configuracoes.jsx            ← só visível para Super Admin (adminOnly)
    Usuarios.jsx                 ← só visível para Super Admin (adminOnly)
    ProcessoDetalhe/
      index.jsx                  ← abas: Notas, Movimentações, Audiências, Partes, Arquivos, Info
      TabNotas.jsx
      TabMovimentacoes.jsx       ← andamentos processuais (separado de notas)
      TabAudiencias.jsx
      TabPartes.jsx
      TabArquivos.jsx            ← upload para Supabase Storage (bucket: juridico)
      TabInfo.jsx
```

---

## Banco de Dados (Supabase)

### Tabelas principais

```sql
jud_processos       -- processo principal (numero, tipo, fase, tribunal, tramitacao, assuntos[])
jud_partes          -- polo ativo/passivo (nome, documento, polo, tipo_pessoa)
jud_audiencias      -- datas de audiência (data, hora, tipo, local, obs)
jud_notas           -- observações manuais do usuário (texto, autor, created_at)
jud_movimentacoes   -- andamentos processuais do sistema (data, hora, evento, origem)
jud_arquivos        -- arquivos anexados (nome, tipo, tamanho, base64 legado, url_externa)
jud_user_permissoes -- permissões jurídicas por usuário (user_uuid → tipos[])
jud_notificacoes    -- notificações de novas movimentações (populada pelo sync automático com o DataJud)
```

### Tabelas externas (já existiam)

```sql
d_auth_user         -- perfil do usuário (uuid → auth.users, nome, email, role_id, is_super_admin, foto_url)
d_auth_roles        -- perfis/roles disponíveis
d_auth_contratos    -- contratos (referenciado por deletar_usuario_auth)
audit_log           -- log de auditoria geral do sistema
```

### Tipos de processo

| Campo `tipo`    | Campo `tribunal`   | Permissão necessária |
|---|---|---|
| `juridico`      | `TRT%`             | `trabalhista` |
| `juridico`      | não começa com TRT | `civel` |
| `administrativo`| qualquer           | `administrativo` |

### Fases

| Valor | Descrição |
|---|---|
| `Conhecimento` | Em andamento, sem decisão final |
| `Execução` | Em fase de cobrança/cumprimento |
| `Arquivado` | Encerrado |

---

## Stored Procedures (RPC via sbClient.rpc)

```sql
criar_usuario_auth(p_email, p_password, p_nome, p_role_id)
  → cria em auth.users + auth.identities + d_auth_user atomicamente
  → retorna UUID do novo usuário

alterar_senha_usuario(p_uuid, p_senha)
  → atualiza encrypted_password em auth.users

deletar_usuario_auth(p_uuid)
  → remove de d_auth_contratos, d_auth_user, auth.identities, auth.users em cascata
```

---

## RLS — Row Level Security

### Funções auxiliares

```sql
jud_pode_ver_processo(p_tipo, p_tribunal) → BOOLEAN
  -- Super admin: sempre TRUE
  -- trabalhista: tipo=juridico AND tribunal ILIKE 'TRT%'
  -- civel: tipo=juridico AND tribunal NOT ILIKE 'TRT%'
  -- administrativo: tipo=administrativo

jud_pode_ver_por_processo(p_processo_id) → BOOLEAN
  -- chama jud_pode_ver_processo para o processo pai
```

### Políticas

- `jud_processos` → `jud_pode_ver_processo(tipo, tribunal)`
- Tabelas filhas (partes, audiencias, notas, movimentacoes, arquivos) → `jud_pode_ver_por_processo(processo_id)`
- `jud_user_permissoes` → usuário vê só a própria linha; Super Admin lê/escreve tudo

---

## Supabase Storage

- **Bucket:** `juridico` (público)
- **Caminho:** `processos/{processo_id}/{uuid}.{ext}`
- Imagens são **comprimidas antes do upload** (Canvas API, JPEG 75%, max 1920px)
- Ao deletar arquivo: `sb_deletarArquivoStorage(url)` remove do bucket
- Arquivos legados em base64 continuam funcionando (retrocompatibilidade)

---

## Autenticação e Permissões

### Fluxo de login
1. Supabase Auth (`sbClient.auth.signInWithPassword`)
2. Após login: busca `d_auth_user.is_super_admin` para definir `isSuperAdmin`
3. Sidebar filtra itens `adminOnly: true` se não for Super Admin

### Permissões jurídicas (`jud_user_permissoes.tipos[]`)
- `trabalhista` — vê processos TRT
- `civel` — vê processos TJ (não TRT)
- `administrativo` — vê processos administrativos
- Super Admin (`is_super_admin = true`) — vê tudo

### Páginas restritas a Super Admin
- **Usuários** (`/usuarios`) — gerenciar usuários e permissões
- **Configurações** (`/config`) — chave Claude, migração de dados

---

## Importação de Processos

### 1. Importar Notificação (ModalDJE)
- Aceita: `.pdf`, `.txt`
- PDF com texto → parser de regex (DJE format)
- PDF escaneado → pdfjs → imagens → Claude Vision
- Resultado: cria ou atualiza processo existente

### 2. Colar Texto (ModalTexto)
- Aceita qualquer texto colado
- Tenta `parsearTextoEstruturado` (formato PJUD/CNOG — estrutura chave/valor)
- Se não reconhecer → Claude Haiku extrai os dados (requer chave configurada)
- Extrai: número, tribunal, vara, partes, audiência, assuntos, Log de Auditoria → movimentações

---

## Variáveis de Ambiente (.env)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=eyJ...  (anon key)
VITE_SUPABASE_SERVICE_KEY=eyJ... (service role key — necessário para criar usuários)
VITE_CLAUDE_KEY=sk-ant-...
```

### Variáveis do backend (Vercel, não usar prefixo VITE_)

Usadas só por `api/sync-datajud.js` (roda no servidor, nunca no bundle do frontend):

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...        (service role key — bypassa RLS)
DATAJUD_API_KEY=...                (opcional — sobrescreve a chave pública padrão do DataJud)
CRON_SECRET=...                    (opcional — protege o endpoint contra chamadas manuais)
```

---

## Sincronização Automática com o DataJud (CNJ)

- **`api/sync-datajud.js`** — Vercel Serverless Function, disparada 1x/dia pelo Vercel Cron (`vercel.json` → `crons`, horário `0 11 * * *` UTC ≈ 08h BRT).
- Para cada processo `tipo=juridico` não arquivado, consulta a API Pública do DataJud (`api-publica.datajud.cnj.jus.br`) pelo número do processo.
- **Cobertura:** apenas TRT e TJ (padrão de endpoint confirmado na documentação oficial). TRF/TST/STJ/STF são ignorados por ora.
- Movimentações novas (que ainda não existem em `jud_movimentacoes`) são inseridas com `origem = 'DataJud (CNJ)'`, e uma notificação é criada em `jud_notificacoes`.
- O sino de notificações (`src/components/NotificacaoSino.jsx`, na Sidebar) exibe as notificações não lidas, com polling a cada 3 minutos. Clicar numa notificação marca como lida e abre o processo.
- A chave pública do DataJud já vem embutida no código (é compartilhada oficialmente por todos, não é secreta) — só é necessário configurar `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` na Vercel para o sync funcionar.

---

## Empresas e CNPJs Monitorados

| Empresa | CNPJ |
|---|---|
| D.B. Machado Ltda (matriz) | 18.612.782/0001-85 |
| D.B. Machado Ltda (filial) | 18.612.782/0002-66 |
| Rede Forte Construções Ltda | 44.155.132/0001-68 |
| Gomes e Machado Ltda | 37.287.216/0001-90 |

---

## Comandos

```bash
npm run dev      # servidor local (porta 5173)
npm run build    # gera dist/ para deploy
npm run preview  # pré-visualiza o build
```
