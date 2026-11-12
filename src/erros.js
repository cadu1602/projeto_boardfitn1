// Erros da API e tradução de erros do PostgreSQL para respostas HTTP.
class ApiError extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

const bad = (msg, det) => new ApiError(400, msg, det);
const naoEncontrado = (msg = 'Recurso não encontrado.') => new ApiError(404, msg);

function tratarErros(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição grande demais.' });
  }
  // Erros do PostgreSQL
  if (err && err.code === '23505') return res.status(409).json({ erro: 'Já existe um registro com esses dados.' });
  if (err && err.code === '23503') return res.status(409).json({ erro: 'Operação bloqueada: há registros ligados a este item.' });
  if (err && err.code === '23514') return res.status(400).json({ erro: 'Valor fora das regras permitidas.' });
  console.error('Erro inesperado:', err && err.message);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { ApiError, bad, naoEncontrado, tratarErros };
