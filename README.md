# BoardFit — O seu Shaper Virtual 🏄

> Informe peso, altura e nível de surf e descubra a litragem ideal e os modelos de prancha que combinam com você.

Projeto Universitário · ADS21 · UNICESUSC
Equipe: Caio Marçal · Carlos Eduardo · Simon Pais · Matheus Nicolai

## Como funciona

O site (HTML/CSS/JavaScript puro) conversa com uma API Node.js (Express) que consulta um banco PostgreSQL.

1. O front envia peso, altura e nível para `POST /api/recomendacoes`.
2. O banco calcula a litragem (função `calcular_litragem`) e o servidor escolhe até 2 modelos compatíveis (`modelo_prancha`), com a quilha padrão e as lojas já ordenadas por preço (`vw_ofertas_priorizadas`).
3. O front mostra os modelos, calcula as medidas da prancha (`medidas.js`) e deixa o usuário **salvar** os preferidos em **Minhas pranchas**. O CRUD (salvar, editar anotação/dados, excluir) grava no PostgreSQL, na tabela `prancha_salva`. Não há login: cada navegador gera um código anônimo (UUID) e só vê as próprias pranchas.
4. Ao clicar em **Ver na loja**, o clique é registrado no banco (sem dados pessoais) e o link abre.

## ▶️ Como rodar

Precisa do [Node.js 18+](https://nodejs.org). **Não abra o `index.html` com duplo clique:** o site precisa do servidor para chamar a API.

**Só para testar (sem instalar PostgreSQL):**

```
npm install
npm run demo
```

Abra http://localhost:3000. O banco fica em memória e os dados somem ao fechar.

**Com PostgreSQL de verdade:**

```
npm install
copy .env.example .env      (no Linux/Mac: cp .env.example .env)
npm run criar-banco         (cria o esquema "boardfit" e os dados iniciais — APAGA o que existir nele)
npm start
```

O banco `boardfit` precisa existir antes (`createdb board_fit`) e a `DATABASE_URL` do `.env` deve apontar para ele.

**Testes da API:** `npm test` (usa um PostgreSQL em memória, não mexe no seu banco).

## 📁 Estrutura

```
boardfit/
├── public/                    # Front-end (servido pelo Express)
│   ├── index.html             # Página inicial
│   ├── calculadora.html       # Calculadora e Minhas pranchas
│   ├── style.css
│   └── js/
│       ├── config.js          # URL da API e chave do localStorage
│       ├── api.js             # Chamadas à API (fetch)
│       ├── validacao.js       # Validação do formulário
│       ├── medidas.js         # Tamanho, largura, espessura e borda
│       ├── crud.js            # CRUD de "Minhas pranchas" (chama a API)
│       ├── pagina.js          # Tela: DOM e eventos
│       └── menu.js            # Menu hambúrguer
├── src/                       # Back-end
│   ├── server.js              # Sobe o servidor
│   ├── app.js                 # Express, segurança e arquivos estáticos
│   ├── config.js              # Variáveis de ambiente
│   ├── db.js                  # Acesso ao PostgreSQL
│   ├── db-pglite.js           # PostgreSQL em memória (demo e testes)
│   ├── recomendacao.js        # Regras de recomendação
│   ├── validacao.js           # Validação das entradas
│   ├── erros.js               # Tratamento de erros
│   └── rotas/
│       ├── publicas.js        # Níveis, modelos, recomendação, cliques
│       └── pranchas.js        # CRUD de "Minhas pranchas"
├── db/
│   ├── boardfit_banco_de_dados.sql      # cria o esquema inteiro (apaga e recria)
│   └── migracao_prancha_salva.sql       # só adiciona a tabela prancha_salva num banco já existente
├── scripts/                   # criar-banco.js e demo.js
├── tests/api.test.js
├── package.json
└── .env.example
```

Ordem dos `<script>` em `calculadora.html`: `menu` → `config` → `api` → `validacao` → `medidas` → `crud` → `pagina`.

## 🔌 API

| Método e rota | Para quê |
|---|---|
| `GET /api/niveis` | Níveis de surf do formulário |
| `POST /api/recomendacoes` | `{ pesoKg, alturaCm, nivelId }` → litragem, modelo recomendado, alternativa, quilhas e ofertas |
| `POST /api/ofertas/:id/clique` | `{ consultaId }` → registra o clique e devolve o link da loja |
| `POST /api/consultas/:id/satisfacao` | `{ nota }` de 1 a 5 |
| `GET /api/quilhas` | Tipos de quilha |
| `GET /api/modelos` | Modelos de prancha (usado ao editar) |
| `GET /api/pranchas` | Lista "Minhas pranchas" (cabeçalho `X-Cliente-Id`) |
| `POST /api/pranchas` | Salva `{ modeloId, nivelId, litragem, tamanho, nota }` (409 se já existir) |
| `PUT /api/pranchas/:id` | Edita a prancha |
| `DELETE /api/pranchas/:id` | Exclui a prancha |
| `GET /api/saude` | Verifica a conexão com o banco |

> ⚠️ Os coeficientes, as faixas de litragem e as medidas são valores de partida e precisam ser confirmados com um shaper. As lojas e os links do banco são exemplos (`example.com`).
