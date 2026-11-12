const { bad } = require('./erros');

// Faixas realistas do RF-001 (as mesmas do CHECK da tabela consulta)
const PESO_MIN = 20, PESO_MAX = 200;
const ALTURA_MIN = 100, ALTURA_MAX = 220;

function numero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : NaN;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor.trim().replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function inteiro(valor, campo) {
  const n = numero(valor);
  if (!Number.isInteger(n)) throw bad(`${campo} deve ser um número inteiro.`);
  return n;
}

// RF-001: peso, altura e nível obrigatórios e dentro das faixas. Nenhum dado pessoal (RN-003).
function validarEntrada(corpo) {
  const erros = {};
  const c = corpo || {};
  const peso = numero(c.pesoKg);
  const altura = numero(c.alturaCm);
  const nivelId = numero(c.nivelId);

  if (c.pesoKg === undefined || c.pesoKg === null || c.pesoKg === '') erros.pesoKg = 'Informe o peso.';
  else if (Number.isNaN(peso)) erros.pesoKg = 'O peso deve ser um número.';
  else if (peso < PESO_MIN || peso > PESO_MAX) erros.pesoKg = `O peso deve estar entre ${PESO_MIN} e ${PESO_MAX} kg.`;

  if (c.alturaCm === undefined || c.alturaCm === null || c.alturaCm === '') erros.alturaCm = 'Informe a altura.';
  else if (Number.isNaN(altura)) erros.alturaCm = 'A altura deve ser um número.';
  else if (altura < ALTURA_MIN || altura > ALTURA_MAX) erros.alturaCm = `A altura deve estar entre ${ALTURA_MIN} e ${ALTURA_MAX} cm.`;

  if (c.nivelId === undefined || c.nivelId === null || c.nivelId === '') erros.nivelId = 'Informe o nível de surf.';
  else if (!Number.isInteger(nivelId) || nivelId < 1) erros.nivelId = 'Nível de surf inválido.';

  if (Object.keys(erros).length) throw bad('Dados inválidos.', erros);
  // O banco guarda peso com 1 casa e altura inteira; calculamos com os mesmos valores.
  return { pesoKg: Math.round(peso * 10) / 10, alturaCm: Math.round(altura), nivelId };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validarUuid(v, campo = 'id') {
  if (typeof v !== 'string' || !UUID.test(v)) throw bad(`${campo} inválido.`);
  return v;
}

function validarIdNumerico(v, campo = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) throw bad(`${campo} inválido.`);
  return n;
}

function textoObrigatorio(v, campo, max) {
  if (typeof v !== 'string' || v.trim() === '') throw bad(`${campo} é obrigatório.`);
  if (v.trim().length > max) throw bad(`${campo} deve ter no máximo ${max} caracteres.`);
  return v.trim();
}

function textoOpcional(v, campo, max) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw bad(`${campo} deve ser texto.`);
  if (v.trim().length > max) throw bad(`${campo} deve ter no máximo ${max} caracteres.`);
  return v.trim();
}

// RNF-006: só aceitamos links https
function urlHttps(v, campo, max = 500) {
  const t = textoObrigatorio(v, campo, max);
  let u;
  try { u = new URL(t); } catch { throw bad(`${campo} não é uma URL válida.`); }
  if (u.protocol !== 'https:') throw bad(`${campo} deve começar com https://`);
  return t;
}

function booleano(v, campo) {
  if (typeof v !== 'boolean') throw bad(`${campo} deve ser true ou false.`);
  return v;
}

function precoValido(v) {
  const n = numero(v);
  if (Number.isNaN(n) || n <= 0 || n > 99999999) throw bad('O preço deve ser um número maior que zero.');
  return Math.round(n * 100) / 100;
}

module.exports = {
  PESO_MIN, PESO_MAX, ALTURA_MIN, ALTURA_MAX,
  numero, inteiro, validarEntrada, validarUuid, validarIdNumerico,
  textoObrigatorio, textoOpcional, urlHttps, booleano, precoValido,
};
