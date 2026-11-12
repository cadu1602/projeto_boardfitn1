// api.js — conversa com o servidor (busca os dados)
// Quem mostra na tela é o pagina.js; o CRUD das pranchas salvas está no crud.js.

// Código anônimo deste navegador (UUID). Não identifica uma pessoa: serve só para
// o banco saber quais pranchas salvas são "deste navegador".
function idDoCliente() {
  var id = null;
  try { id = localStorage.getItem(CHAVE_CLIENTE); } catch (e) { /* sem acesso ao localStorage */ }
  if (id) { return id; }

  var b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // versão 4
  b[8] = (b[8] & 0x3f) | 0x80;
  var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  id = h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  try { localStorage.setItem(CHAVE_CLIENTE, id); } catch (e) { /* segue sem guardar */ }
  return id;
}

// Faz a chamada e devolve o JSON (ou null, se a resposta não tiver corpo).
// Se o servidor responder com erro, lança um Error com .status e .detalhes
// (mensagens por campo, quando houver).
async function chamarApi(metodo, caminho, corpo) {
  var opcoes = {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'X-Cliente-Id': idDoCliente() }
  };
  if (corpo !== undefined) { opcoes.body = JSON.stringify(corpo); }

  var resposta = await fetch(API_URL + caminho, opcoes);
  var json = null;
  try { json = await resposta.json(); } catch (e) { /* resposta sem corpo (ex: 204) */ }

  if (!resposta.ok) {
    var erro = new Error((json && json.erro) || 'Erro ao falar com o servidor.');
    erro.status = resposta.status;
    erro.detalhes = (json && json.detalhes) || null;
    throw erro;
  }
  return json;
}

// GET /api/niveis -> [{ id, nome }]
function buscarNiveis() {
  return chamarApi('GET', '/niveis');
}

// GET /api/modelos -> [{ id, nome }]
function buscarModelos() {
  return chamarApi('GET', '/modelos');
}

// POST /api/recomendacoes -> litragem, modelo recomendado, alternativa, quilhas e ofertas
function buscarRecomendacao(pesoKg, alturaCm, nivelId) {
  return chamarApi('POST', '/recomendacoes', { pesoKg: pesoKg, alturaCm: alturaCm, nivelId: nivelId });
}

// POST /api/ofertas/:id/clique -> { url } (registra o clique e devolve o link da loja)
function registrarClique(ofertaId, consultaId) {
  return chamarApi('POST', '/ofertas/' + ofertaId + '/clique', { consultaId: consultaId });
}
