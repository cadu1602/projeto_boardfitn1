// validacao.js — validação do formulário (resposta rápida, antes de chamar a API)
// O servidor valida de novo com as mesmas faixas (src/validacao.js).

var PESO_MIN = 20, PESO_MAX = 200;
var ALTURA_MIN = 100, ALTURA_MAX = 220;

// Devolve um objeto com as mensagens de erro (vazio = tudo certo)
function validar(peso, altura, nivel) {
  var erros = {};

  if (peso === '') {
    erros.peso = 'Informe seu peso.';
  } else if (Number(peso) < PESO_MIN || Number(peso) > PESO_MAX) {
    erros.peso = 'O peso deve estar entre ' + PESO_MIN + ' e ' + PESO_MAX + ' kg.';
  }

  if (altura === '') {
    erros.altura = 'Informe sua altura.';
  } else if (Number(altura) < ALTURA_MIN || Number(altura) > ALTURA_MAX) {
    erros.altura = 'A altura deve estar entre ' + ALTURA_MIN + ' e ' + ALTURA_MAX + ' cm.';
  }

  if (nivel === '') {
    erros.nivel = 'Escolha seu nível.';
  }
  return erros;
}
