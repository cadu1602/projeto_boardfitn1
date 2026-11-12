// Motor de recomendação: RF-002, RF-003, RF-004, RF-005, RF-006, RF-008.
// Regras: RN-001 (litragem x modelo), RN-002 (preço), RN-004 (quilha vem do modelo),
// RN-005 (só links ativos), RN-006 (neutralidade: nada de comissão, só técnica e preço).
// Determinístico (RNF-004): mesma entrada => mesma saída; os empates são decididos pelo id.

const FAIXA_PRECO_IDEAL = 1000; // RN-002 (a mesma regra da view vw_ofertas_priorizadas)

async function buscarNivel(db, nivelId) {
  const r = await db.query('SELECT id, nome FROM nivel_surf WHERE id = $1', [nivelId]);
  return r.rows[0] || null;
}

// RF-002: usa a função calcular_litragem do banco (coeficientes ajustáveis no banco)
async function calcularLitragem(db, { pesoKg, alturaCm, nivelId }) {
  const r = await db.query('SELECT calcular_litragem($1::numeric, $2::numeric, $3::integer) AS litros', [pesoKg, alturaCm, nivelId]);
  const v = r.rows[0] && r.rows[0].litros;
  return v === null || v === undefined ? null : Number(v);
}

// RF-003 + RN-001: modelos ativos, do nível informado, cuja faixa contém a litragem.
// Ordem: mais perto do centro da faixa primeiro; empate pelo id.
async function modelosCompativeis(db, litros, nivelId, limite = 2) {
  const r = await db.query(
    `SELECT m.id, m.nome, m.descricao, m.litragem_min, m.litragem_max
       FROM modelo_prancha m
       JOIN modelo_nivel mn ON mn.modelo_id = m.id AND mn.nivel_id = $2
      WHERE m.ativo AND $1::numeric BETWEEN m.litragem_min AND m.litragem_max
      ORDER BY ABS($1::numeric - (m.litragem_min + m.litragem_max) / 2), m.id
      LIMIT $3`,
    [litros, nivelId, limite],
  );
  return r.rows;
}

// RF-004 + RN-004: a quilha é sempre derivada do modelo
async function quilhasDoModelo(db, modeloId) {
  const r = await db.query(
    `SELECT q.id, q.nome, mq.padrao
       FROM modelo_quilha mq JOIN tipo_quilha q ON q.id = mq.quilha_id
      WHERE mq.modelo_id = $1
      ORDER BY mq.padrao DESC, q.nome`,
    [modeloId],
  );
  const padrao = r.rows.find((q) => q.padrao) || null;
  return {
    padrao: padrao && { id: padrao.id, nome: padrao.nome },
    alternativas: r.rows.filter((q) => !q.padrao).map((q) => ({ id: q.id, nome: q.nome })),
  };
}

// RF-005 + RF-006 + RN-002 + RN-005 + RN-006: só links ativos, ordenados pela view
async function ofertasDoModelo(db, modeloId) {
  const r = await db.query(
    `SELECT oferta_id, loja, preco, dentro_da_faixa, posicao
       FROM vw_ofertas_priorizadas WHERE modelo_id = $1 ORDER BY posicao`,
    [modeloId],
  );
  return r.rows.map((o) => ({
    id: o.oferta_id,
    loja: o.loja,
    preco: Number(o.preco),
    dentroDaFaixaIdeal: o.dentro_da_faixa,
    posicao: Number(o.posicao),
    // O link real só é entregue ao clicar (POST /api/ofertas/:id/clique), para registrar a métrica.
  }));
}

async function montarModelo(db, m) {
  return {
    id: m.id,
    nome: m.nome,
    descricao: m.descricao,
    faixaLitragem: { min: Number(m.litragem_min), max: Number(m.litragem_max) },
    quilhas: await quilhasDoModelo(db, m.id),
    ofertas: await ofertasDoModelo(db, m.id),
  };
}

// Fluxo completo: calcula, indica, sugere quilha, alternativa e ofertas, e guarda a consulta anônima.
async function recomendar(db, entrada) {
  const nivel = await buscarNivel(db, entrada.nivelId);
  if (!nivel) return { erroNivel: true };

  const litragem = await calcularLitragem(db, entrada);
  const modelos = await modelosCompativeis(db, litragem, entrada.nivelId, 2);

  // RN-003: a consulta guarda só peso, altura, nível e resultado — nada que identifique a pessoa.
  const c = await db.query(
    `INSERT INTO consulta (peso_kg, altura_cm, nivel_id, litragem_calculada, modelo_indicado_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [entrada.pesoKg, entrada.alturaCm, entrada.nivelId, litragem, modelos[0] ? modelos[0].id : null],
  );

  const resposta = {
    consultaId: c.rows[0].id,
    entrada: { pesoKg: entrada.pesoKg, alturaCm: entrada.alturaCm, nivel },
    litragem, // RF-002: uma casa decimal
    faixaPrecoIdeal: FAIXA_PRECO_IDEAL,
    recomendacao: null,
    alternativa: null, // RF-008
  };

  if (!modelos.length) {
    resposta.mensagem = 'Não encontramos um modelo compatível com esse perfil. Revise os dados ou fale com um shaper.';
    return resposta;
  }
  resposta.recomendacao = await montarModelo(db, modelos[0]);
  if (modelos[1]) resposta.alternativa = await montarModelo(db, modelos[1]);
  return resposta;
}

module.exports = { recomendar, calcularLitragem, modelosCompativeis, FAIXA_PRECO_IDEAL };
