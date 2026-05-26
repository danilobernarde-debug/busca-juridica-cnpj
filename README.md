# Busca Jurídica por CNPJ — DataJud CNJ

Sistema web para consulta de processos judiciais por CNPJ em todos os tribunais brasileiros via API pública do **DataJud (CNJ)**.

## Acesso rápido

🔗 **[Abrir o sistema](https://seuusuario.github.io/busca-juridica-cnpj)**

## Funcionalidades

- Busca por CNPJ em **57+ tribunais** simultaneamente
- Cobre todos os **TJs estaduais**, **TRFs**, **TRTs** e **tribunais superiores**
- Busca paralela com atualização em tempo real
- Exibição de partes, assunto, data de ajuizamento, valor da causa e órgão julgador
- Exportação dos resultados em **CSV** e **JSON**
- Visualização do JSON completo de cada processo
- Interface responsiva (desktop e mobile)

## Tribunais cobertos

| Tipo | Quantidade |
|------|------------|
| Tribunais de Justiça Estaduais (TJ) | 27 |
| Tribunais Regionais Federais (TRF) | 6 |
| Tribunais Regionais do Trabalho (TRT) | 24 |
| Tribunais Superiores (STJ, TST) | 2 |
| **Total** | **59** |

## Como usar

1. Acesse o sistema pelo link acima (ou abra `index.html` localmente)
2. Digite o CNPJ da empresa no campo de busca
3. Selecione os tribunais desejados (padrão: todos os TJs e TRFs)
4. Clique em **Buscar Processos**
5. Aguarde a busca em paralelo — os resultados aparecem progressivamente
6. Exporte em CSV ou JSON se necessário

## Uso local (sem internet para o app em si)

Basta abrir o arquivo `index.html` diretamente no navegador. A API do DataJud é chamada via HTTPS a partir do seu navegador.

## API utilizada

**DataJud — Portal Nacional de Dados do Poder Judiciário**
- Base URL: `https://api-publica.datajud.cnj.jus.br`
- Autenticação: API Key pública fornecida pelo CNJ
- Documentação: [datajud.cnj.jus.br](https://datajud.cnj.jus.br)

## Hospedagem (GitHub Pages)

Este sistema funciona como página estática no GitHub Pages:

```bash
# 1. Crie o repositório no GitHub
gh repo create busca-juridica-cnpj --public --source=. --push

# 2. Ative o GitHub Pages nas configurações do repositório
# Settings → Pages → Source: Deploy from a branch → main → / (root)
```

## Estrutura do projeto

```
├── index.html          # Aplicação completa (HTML + CSS + JS)
├── teste_datajud.html  # Ferramenta de diagnóstico da API
└── README.md           # Esta documentação
```

---

Desenvolvido por DB Machado LTDA | Dados via CNJ/DataJud
