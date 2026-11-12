// Uso: node testar-conexao.js
// Coloque este arquivo na raiz do projeto (junto do package.json e do .env).
// Ele testa a conexão com o PostgreSQL e diz qual é o problema.
require('dotenv').config();
const { Client } = require('pg');

console.log('Conectando em:', (process.env.DATABASE_URL || '(sem .env!)').replace(/:[^:@/]*@/, ':****@'));

const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => console.log('1) CONECTOU no PostgreSQL'))
  .then(() => c.query('SELECT id, nome FROM boardfit.nivel_surf ORDER BY id'))
  .then((r) => console.log('2) TABELA OK, níveis:', r.rows.map((x) => x.nome).join(', ')))
  .catch((e) => console.log('ERRO:', e.code || '', e.message))
  .finally(() => c.end());