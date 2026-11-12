// src/db.js — camada de acesso ao banco. O resto do sistema usa só { query, tx, close }.
const { Pool } = require('pg');

function criarDbPostgres(config) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
    // O esquema do projeto se chama "boardfit"
    options: '-c search_path=boardfit,public',
  });

  pool.on('error', (err) => {
    console.error('Erro na conexão com PostgreSQL:', err.message);
  });

  pool.on('connect', () => {
    console.log('Conectado ao PostgreSQL!');
  });

  return {
    query: (sql, params = []) => pool.query(sql, params),
    // Executa várias consultas na mesma transação (tudo ou nada)
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const resultado = await fn((sql, params = []) => client.query(sql, params));
        await client.query('COMMIT');
        return resultado;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

module.exports = { criarDbPostgres };