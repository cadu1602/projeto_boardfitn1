// Pranchas salvas ("Minhas pranchas"): CRUD no banco.
// Não existe login (RN-003): cada navegador manda um código anônimo (UUID) no cabeçalho
// X-Cliente-Id e só enxerga as próprias pranchas.
const express = require('express');
const { validarUuid, validarIdNumerico, numero, textoOpcional } = require('../validacao');
const { bad, naoEncontrado } = require('../erros');

const LITRAGEM_MIN = 10;
const LITRAGEM_MAX = 120;

const SELECT_PRANCHA = `
  SELECT p.id, p.modelo_id, m.nome AS modelo, p.nivel_id, n.nome AS nivel,
         p.litragem, p.tamanho, p.nota
    FROM prancha_salva p
    JOIN modelo_prancha m ON m.id = p.modelo_id
    JOIN nivel_surf     n ON n.id = p.nivel_id`;

function formatar(l) {
  return {
    id: Number(l.id),
    modeloId: l.modelo_id,
    modelo: l.modelo,
    nivelId: l.nivel_id,
    nivel: l.nivel,
    litragem: Number(l.litragem),
    tamanho: l.tamanho,
    nota: l.nota,
  };
}

function clienteDaRequisicao(req) {
  return validarUuid(req.get('X-Cliente-Id'), 'Identificador do navegador');
}

// Valida o corpo (POST e PUT usam os mesmos campos)
async function lerCorpo(db, corpo) {
  const c = corpo || {};
  const modeloId = validarIdNumerico(c.modeloId, 'Modelo');
  const nivelId = validarIdNumerico(c.nivelId, 'Nível');
  const litragem = numero(c.litragem);
  if (Number.isNaN(litragem) || litragem < LITRAGEM_MIN || litragem > LITRAGEM_MAX) {
    throw bad(`A litragem deve estar entre ${LITRAGEM_MIN} e ${LITRAGEM_MAX} L.`);
  }
  const tamanho = textoOpcional(c.tamanho, 'O tamanho', 10) || '';
  const nota = textoOpcional(c.nota, 'A anotação', 80) || '';

  const m = await db.query('SELECT 1 FROM modelo_prancha WHERE id = $1::integer', [modeloId]);
  if (!m.rows[0]) throw bad('Modelo inválido.');
  const n = await db.query('SELECT 1 FROM nivel_surf WHERE id = $1::integer', [nivelId]);
  if (!n.rows[0]) throw bad('Nível inválido.');

  return { modeloId, nivelId, litragem: Math.round(litragem * 10) / 10, tamanho, nota };
}

function rotasPranchas(db) {
  const r = express.Router();

  // READ: lista as pranchas deste navegador
  r.get('/pranchas', async (req, res) => {
    const cliente = clienteDaRequisicao(req);
    const q = await db.query(`${SELECT_PRANCHA} WHERE p.cliente_id = $1 ORDER BY p.criada_em, p.id`, [cliente]);
    res.json(q.rows.map(formatar));
  });

  // CREATE: salva uma prancha (409 se já estiver na lista)
  r.post('/pranchas', async (req, res) => {
    const cliente = clienteDaRequisicao(req);
    const d = await lerCorpo(db, req.body);
    const ins = await db.query(
      `INSERT INTO prancha_salva (cliente_id, modelo_id, nivel_id, litragem, tamanho, nota)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [cliente, d.modeloId, d.nivelId, d.litragem, d.tamanho, d.nota],
    );
    const q = await db.query(`${SELECT_PRANCHA} WHERE p.id = $1`, [ins.rows[0].id]);
    res.status(201).json(formatar(q.rows[0]));
  });

  // UPDATE: edita modelo, nível, litragem, tamanho e anotação
  r.put('/pranchas/:id', async (req, res) => {
    const cliente = clienteDaRequisicao(req);
    const id = validarIdNumerico(req.params.id, 'Prancha');
    const d = await lerCorpo(db, req.body);
    const up = await db.query(
      `UPDATE prancha_salva
          SET modelo_id = $3, nivel_id = $4, litragem = $5, tamanho = $6, nota = $7, atualizada_em = now()
        WHERE id = $1 AND cliente_id = $2
        RETURNING id`,
      [id, cliente, d.modeloId, d.nivelId, d.litragem, d.tamanho, d.nota],
    );
    if (!up.rows[0]) throw naoEncontrado('Prancha não encontrada.');
    const q = await db.query(`${SELECT_PRANCHA} WHERE p.id = $1`, [id]);
    res.json(formatar(q.rows[0]));
  });

  // DELETE: remove a prancha
  r.delete('/pranchas/:id', async (req, res) => {
    const cliente = clienteDaRequisicao(req);
    const id = validarIdNumerico(req.params.id, 'Prancha');
    const del = await db.query('DELETE FROM prancha_salva WHERE id = $1 AND cliente_id = $2 RETURNING id', [id, cliente]);
    if (!del.rows[0]) throw naoEncontrado('Prancha não encontrada.');
    res.status(204).end();
  });

  return r;
}

module.exports = { rotasPranchas };
