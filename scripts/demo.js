// Uso: npm run demo
// Sobe o BoardFit inteiro (site + API) com um banco PostgreSQL embutido em memória.
// Não precisa instalar PostgreSQL. Os dados somem quando você fecha o programa. Só para testar.
const { criarDbPglite } = require('../src/db-pglite');
const { criarApp } = require('../src/app');

(async () => {
  const db = await criarDbPglite();
  const config = { isProd: false, corsOrigens: ['*'], forcarHttps: false };
  const porta = Number(process.env.PORT) || 3000;
  criarApp(db, config).listen(porta, () => {
    console.log(`
BoardFit (DEMO) rodando:
  Site: http://localhost:${porta}/
`);
  });
})();
