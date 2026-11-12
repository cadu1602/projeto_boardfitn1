// Roda com: npm test  (usa um PostgreSQL embutido em memória, não mexe no seu banco)
const test = require('node:test');
const assert = require('node:assert/strict');
const { criarDbPglite } = require('../src/db-pglite');
const { criarApp } = require('../src/app');

const config = { isProd: false, corsOrigens: ['*'], forcarHttps: false };
let db, servidor, base;

async function api(metodo, caminho, corpo, cliente) {
  const headers = { 'Content-Type': 'application/json' };
  if (cliente) headers['X-Cliente-Id'] = cliente;
  const r = await fetch(base + caminho, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  let json = null; try { json = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, json };
}

test.before(async () => {
  db = await criarDbPglite();
  const app = criarApp(db, config, { limiteGeral: 10000 });
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
test.after(async () => { servidor.close(); await db.close(); });

// ---------------- RF-001: validação ----------------
test('RF-001: campos vazios, fora da faixa e não numéricos são rejeitados', async () => {
  let r = await api('POST', '/recomendacoes', {});
  assert.equal(r.status, 400);
  assert.ok(r.json.detalhes.pesoKg && r.json.detalhes.alturaCm && r.json.detalhes.nivelId);
  r = await api('POST', '/recomendacoes', { pesoKg: 19, alturaCm: 175, nivelId: 2 });
  assert.match(r.json.detalhes.pesoKg, /entre 20 e 200/);
  r = await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 221, nivelId: 2 });
  assert.match(r.json.detalhes.alturaCm, /entre 100 e 220/);
  r = await api('POST', '/recomendacoes', { pesoKg: 'abc', alturaCm: 175, nivelId: 2 });
  assert.match(r.json.detalhes.pesoKg, /número/);
  r = await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 175, nivelId: 99 });
  assert.equal(r.status, 400);
});

// ---------------- RF-002/003/004/005/006/008 ----------------
test('Exemplo do projeto: 70 kg, 175 cm, Em evolução => 36,7 L e Evolution / Híbrida', async () => {
  const r = await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 175, nivelId: 2 });
  assert.equal(r.status, 201);
  assert.equal(r.json.litragem, 36.7);
  assert.equal(r.json.recomendacao.modelo === undefined, true);
  assert.equal(r.json.recomendacao.nome, 'Evolution / Híbrida');
  assert.equal(r.json.recomendacao.quilhas.padrao.nome, 'Tri-fin'); // RF-004 / RN-004
  assert.equal(r.json.alternativa.nome, 'Fish');                    // RF-008
  assert.ok(r.json.recomendacao.faixaLitragem.min <= 36.7 && 36.7 <= r.json.recomendacao.faixaLitragem.max); // RN-001
  assert.ok(r.json.consultaId);
});

test('RNF-004: a mesma entrada sempre dá a mesma saída (10 vezes)', async () => {
  const saidas = [];
  for (let i = 0; i < 10; i++) {
    const { json } = await api('POST', '/recomendacoes', { pesoKg: 82.5, alturaCm: 181, nivelId: 1 });
    delete json.consultaId;
    saidas.push(JSON.stringify(json));
  }
  assert.equal(new Set(saidas).size, 1);
});

test('RN-001: todo modelo indicado cobre a litragem calculada, para vários perfis', async () => {
  for (const nivelId of [1, 2, 3]) {
    for (const pesoKg of [45, 60, 75, 90, 110]) {
      for (const alturaCm of [155, 170, 185, 200]) {
        const { json } = await api('POST', '/recomendacoes', { pesoKg, alturaCm, nivelId });
        for (const m of [json.recomendacao, json.alternativa].filter(Boolean)) {
          assert.ok(m.faixaLitragem.min <= json.litragem && json.litragem <= m.faixaLitragem.max);
        }
      }
    }
  }
});

test('Sem modelo compatível: devolve mensagem e litragem, sem erro', async () => {
  const r = await api('POST', '/recomendacoes', { pesoKg: 200, alturaCm: 100, nivelId: 3 });
  assert.equal(r.status, 201);
  assert.equal(r.json.recomendacao, null);
  assert.ok(r.json.mensagem);
});

test('RF-006/RN-002: ofertas abaixo de R$ 1.000 vêm primeiro, da mais barata; e RN-006: sem campos de comissão', async () => {
  const { json } = await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 175, nivelId: 2 });
  const fish = json.alternativa; // Fish: 990 (dentro) e 1150 (fora)
  assert.deepEqual(fish.ofertas.map((o) => o.preco), [990, 1150]);
  assert.deepEqual(fish.ofertas.map((o) => o.dentroDaFaixaIdeal), [true, false]);
  for (const o of fish.ofertas) {
    assert.equal(o.url, undefined); // o link só sai no clique
    assert.equal(Object.keys(o).some((k) => /comiss|patroc/i.test(k)), false);
  }
});

test('RN-002: se todas as ofertas passam de R$ 1.000, a mais barata continua em primeiro', async () => {
  const r = await api('POST', '/recomendacoes', { pesoKg: 60, alturaCm: 170, nivelId: 3 }); // 25,2 L => Shortboard (1300)
  assert.equal(r.json.recomendacao.nome, 'Shortboard performance');
  assert.equal(r.json.recomendacao.ofertas[0].preco, 1300);
  assert.equal(r.json.recomendacao.ofertas[0].dentroDaFaixaIdeal, false);
});

// ---------------- RN-003: anonimato ----------------
test('RN-003: a tabela consulta não tem coluna de identificação', async () => {
  const cols = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'consulta'")).rows.map((c) => c.column_name);
  assert.equal(cols.some((c) => /nome|email|cpf|ip|usuario/.test(c)), false);
});

test('Consulta é salva e a nota de satisfação é validada', async () => {
  const { json } = await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 175, nivelId: 2 });
  assert.equal((await api('POST', `/consultas/${json.consultaId}/satisfacao`, { nota: 5 })).status, 200);
  assert.equal((await api('POST', `/consultas/${json.consultaId}/satisfacao`, { nota: 6 })).status, 400);
  assert.equal((await api('POST', '/consultas/nao-e-uuid/satisfacao', { nota: 4 })).status, 400);
});

// ---------------- RF-005 / RN-005: clique ----------------
test('Clique devolve o link e registra a métrica; oferta suspensa não sai (RN-005)', async () => {
  const { json } = await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 175, nivelId: 2 });
  const oferta = json.recomendacao.ofertas[0];
  const c = await api('POST', `/ofertas/${oferta.id}/clique`, { consultaId: json.consultaId });
  assert.equal(c.status, 200);
  assert.match(c.json.url, /^https:\/\//);
  assert.equal((await db.query('SELECT COUNT(*)::int n FROM clique_oferta')).rows[0].n >= 1, true);

  await db.query('UPDATE oferta_compra SET ativa = false WHERE id = $1', [oferta.id]);
  const de_novo = await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 175, nivelId: 2 });
  assert.equal(de_novo.json.recomendacao.ofertas.length, 0);
  assert.equal((await api('POST', `/ofertas/${oferta.id}/clique`, { consultaId: json.consultaId })).status, 404);
  await db.query('UPDATE oferta_compra SET ativa = true WHERE id = $1', [oferta.id]);
  assert.equal((await api('POST', '/recomendacoes', { pesoKg: 70, alturaCm: 175, nivelId: 2 })).json.recomendacao.ofertas.length, 1);
});

test('Saúde, rota inexistente e JSON quebrado', async () => {
  assert.equal((await api('GET', '/saude')).json.status, 'ok');
  assert.equal((await api('GET', '/nao-existe')).status, 404);
  const r = await fetch(base + '/recomendacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
  assert.equal(r.status, 400);
});

// ---------------- Minhas pranchas (CRUD no banco) ----------------
test('Minhas pranchas: criar, listar, editar, excluir e isolamento entre navegadores', async () => {
  const A = '11111111-1111-4111-8111-111111111111';
  const B = '22222222-2222-4222-8222-222222222222';
  const corpo = { modeloId: 4, nivelId: 2, litragem: 36.7, tamanho: "5'8\"", nota: '' };

  // sem identificador do navegador
  assert.equal((await api('GET', '/pranchas')).status, 400);

  // CREATE (+ duplicada => 409)
  const c = await api('POST', '/pranchas', corpo, A);
  assert.equal(c.status, 201);
  assert.equal(c.json.modelo, 'Fish');
  assert.equal(c.json.nivel, 'Em evolução');
  assert.equal(c.json.litragem, 36.7);
  assert.equal((await api('POST', '/pranchas', corpo, A)).status, 409);

  // READ
  let l = await api('GET', '/pranchas', undefined, A);
  assert.equal(l.json.length, 1);

  // UPDATE (anotação e troca de modelo)
  const id = c.json.id;
  let u = await api('PUT', `/pranchas/${id}`, { ...corpo, nota: 'ver na loja X' }, A);
  assert.equal(u.status, 200);
  assert.equal(u.json.nota, 'ver na loja X');
  u = await api('PUT', `/pranchas/${id}`, { ...corpo, modeloId: 2, nivelId: 1, litragem: 40 }, A);
  assert.equal(u.json.modelo, 'Funboard');
  assert.equal(u.json.nivel, 'Iniciante');
  l = await api('GET', '/pranchas', undefined, A);
  assert.equal(l.json[0].litragem, 40);

  // outro navegador não vê nem mexe
  assert.equal((await api('GET', '/pranchas', undefined, B)).json.length, 0);
  assert.equal((await api('PUT', `/pranchas/${id}`, corpo, B)).status, 404);
  assert.equal((await api('DELETE', `/pranchas/${id}`, undefined, B)).status, 404);

  // validação
  assert.equal((await api('POST', '/pranchas', { ...corpo, litragem: 500 }, A)).status, 400);
  assert.equal((await api('POST', '/pranchas', { ...corpo, modeloId: 9999 }, A)).status, 400);

  // DELETE
  assert.equal((await api('DELETE', `/pranchas/${id}`, undefined, A)).status, 204);
  assert.equal((await api('GET', '/pranchas', undefined, A)).json.length, 0);
  assert.equal((await api('DELETE', `/pranchas/${id}`, undefined, A)).status, 404);
});

test('Lista de modelos para o formulário de edição', async () => {
  const r = await api('GET', '/modelos');
  assert.equal(r.status, 200);
  assert.ok(r.json.some((m) => m.nome === 'Fish'));
});
