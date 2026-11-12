// Uso: npm run criar-banco
// Roda o SQL do projeto (APAGA e recria o esquema "boardfit" com os dados iniciais).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'boardfit_banco_de_dados.sql'), 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@leandro:5432/board_fit',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Banco criado com os dados iniciais.');
  } finally { await client.end(); }
})().catch((e) => { console.error('Falhou:', e.message); process.exit(1); });
