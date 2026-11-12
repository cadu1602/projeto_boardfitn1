const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { rotasPublicas } = require('./rotas/publicas');
const { rotasPranchas } = require('./rotas/pranchas');
const { tratarErros } = require('./erros');

function criarApp(db, config, opcoes = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // atrás de Render/Railway/Nginx: enxerga o HTTPS original

  // RNF-006: em produção, tudo vai por HTTPS
  if (config.forcarHttps) {
    app.use((req, res, next) => {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    });
  }

  // Em desenvolvimento (http://localhost) não forçamos upgrade para https nos arquivos do site
  app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { upgradeInsecureRequests: config.forcarHttps ? [] : null } } }));
  const todas = config.corsOrigens.includes('*');
  app.use(cors({ origin: todas ? true : config.corsOrigens }));
  app.use(express.json({ limit: '20kb' }));

  // Limites de uso (guardados só em memória; nenhum IP vai para o banco — RN-003)
  const limiteGeral = rateLimit({ windowMs: 60_000, limit: opcoes.limiteGeral || 120, standardHeaders: true, legacyHeaders: false, message: { erro: 'Muitas requisições. Tente de novo em instantes.' } });
  app.use('/api', limiteGeral);

  app.get('/api/saude', async (req, res) => {
    try { await db.query('SELECT 1'); res.json({ status: 'ok' }); }
    catch { res.status(503).json({ status: 'sem conexão com o banco' }); }
  });

  app.use('/api', rotasPublicas(db));
  app.use('/api', rotasPranchas(db));

  // Front-end (página inicial em / e calculadora em /calculadora.html)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use(tratarErros);
  return app;
}

module.exports = { criarApp };
