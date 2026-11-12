// Banco PostgreSQL embutido (em memória), só para DEMO e TESTES. Não precisa instalar nada.
// Em produção use o PostgreSQL de verdade (src/db.js).
const fs = require('fs');
const path = require('path');

async function criarDbPglite() {
  const { PGlite } = require('@electric-sql/pglite');
  const pg = new PGlite();
  await pg.exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'boardfit_banco_de_dados.sql'), 'utf8'));
  await pg.exec('SET search_path = boardfit, public');
  return {
    query: (sql, params = []) => pg.query(sql, params),
    tx: (fn) => pg.transaction((t) => fn((sql, params = []) => t.query(sql, params))),
    close: () => pg.close(),
  };
}

module.exports = { criarDbPglite };
