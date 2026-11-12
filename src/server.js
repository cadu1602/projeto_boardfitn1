const { carregarConfig } = require('./config');
const { criarDbPostgres } = require('./db');
const { criarApp } = require('./app');

const config = carregarConfig();
const db = criarDbPostgres(config);
const app = criarApp(db, config);

const servidor = app.listen(config.porta, () => {
  console.log(`BoardFit API rodando na porta ${config.porta}`);
});

function encerrar() {
  servidor.close(async () => { await db.close(); process.exit(0); });
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
