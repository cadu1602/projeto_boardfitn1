// crud.js — "Minhas pranchas": o CRUD grava no PostgreSQL (tabela prancha_salva) pela API.
// Create = salvarPrancha | Read = lerSalvas | Update = atualizarPrancha | Delete = excluirPrancha
// Cada prancha tem: { modeloId, nivelId, litragem, tamanho, nota }

// READ: devolve a lista de pranchas deste navegador
function lerSalvas() {
  return chamarApi('GET', '/pranchas');
}

// CREATE: devolve true se salvou e false se a prancha já estava na lista (erro 409)
async function salvarPrancha(dados) {
  try {
    await chamarApi('POST', '/pranchas', dados);
    return true;
  } catch (erro) {
    if (erro.status === 409) { return false; }
    throw erro;
  }
}

// UPDATE: troca os dados da prancha (manda todos os campos)
function atualizarPrancha(id, dados) {
  return chamarApi('PUT', '/pranchas/' + id, dados);
}

// DELETE: remove a prancha
function excluirPrancha(id) {
  return chamarApi('DELETE', '/pranchas/' + id);
}
