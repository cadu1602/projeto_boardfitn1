require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function carregarConfig() {
  const cfg = {
    isProd,
    porta: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@leandro:5432/board_fit',
    dbSsl: process.env.DB_SSL === 'true',
    corsOrigens: (process.env.CORS_ORIGENS || '*').split(',').map((s) => s.trim()).filter(Boolean),
    // RNF-006: em produção, redireciona HTTP para HTTPS
    forcarHttps: isProd && process.env.FORCAR_HTTPS !== 'false',
  };
  return cfg;
}

module.exports = { carregarConfig };
