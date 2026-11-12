// Rotas abertas (sem login): usadas pela landing page e pelo formulário do surfista.
const express = require('express');
const { recomendar } = require('../recomendacao');
const { validarEntrada, validarUuid, validarIdNumerico, inteiro } = require('../validacao');
const { bad, naoEncontrado, ApiError } = require('../erros');

function rotasPublicas(db) {
  const r = express.Router();

  // Níveis para montar o campo "nível de surf" do formulário (RF-001)
  r.get('/niveis', async (req, res) => {
    const q = await db.query('SELECT id, nome FROM nivel_surf ORDER BY id');
    res.json(q.rows);
  });

  // RF-001 a RF-006 e RF-008 em uma chamada só
  r.post('/recomendacoes', async (req, res) => {
    const entrada = validarEntrada(req.body);
    const resultado = await recomendar(db, entrada);
    if (resultado.erroNivel) throw bad('Dados inválidos.', { nivelId: 'Nível de surf inválido.' });
    res.status(201).json(resultado);
  });

  // Nota de satisfação (métrica do MVP Canvas) — anônima
  r.post('/consultas/:id/satisfacao', async (req, res) => {
    const id = validarUuid(req.params.id, 'Consulta');
    const nota = inteiro(req.body && req.body.nota, 'A nota');
    if (nota < 1 || nota > 5) throw bad('A nota deve ser de 1 a 5.');
    const q = await db.query('UPDATE consulta SET nota_satisfacao = $2 WHERE id = $1 RETURNING id', [id, nota]);
    if (!q.rows[0]) throw naoEncontrado('Consulta não encontrada.');
    res.json({ ok: true });
  });

  // Surfista clicou em "comprar": registra o clique (métrica) e devolve o link (RF-005, RN-005)
  r.post('/ofertas/:id/clique', async (req, res) => {
    const ofertaId = validarIdNumerico(req.params.id, 'Oferta');
    const consultaId = validarUuid(req.body && req.body.consultaId, 'consultaId');
    // Só links ativos de lojas ativas (a view já filtra, RN-005)
    const o = await db.query('SELECT oferta_id, url FROM vw_ofertas_priorizadas WHERE oferta_id = $1', [ofertaId]);
    if (!o.rows[0]) throw naoEncontrado('Oferta indisponível.');
    const c = await db.query('SELECT id FROM consulta WHERE id = $1', [consultaId]);
    if (!c.rows[0]) throw naoEncontrado('Consulta não encontrada.');
    await db.query('INSERT INTO clique_oferta (consulta_id, oferta_id) VALUES ($1, $2)', [consultaId, ofertaId]);
    res.json({ url: o.rows[0].url });
  });

  // Lista de quilhas (informativo)
  r.get('/quilhas', async (req, res) => {
    const q = await db.query('SELECT id, nome FROM tipo_quilha ORDER BY id');
    res.json(q.rows);
  });

  // Modelos de prancha (usado no formulário de editar "Minhas pranchas")
  r.get('/modelos', async (req, res) => {
    const q = await db.query('SELECT id, nome FROM modelo_prancha WHERE ativo ORDER BY id');
    res.json(q.rows);
  });

  return r;
}

module.exports = { rotasPublicas, ApiError };
