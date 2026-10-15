// BoardFit — calculadora de prancha (Sprint 2)
// Fluxo: usuário informa peso, altura e nível -> calculamos a litragem
// -> mostramos até 3 modelos compatíveis -> ele pode salvar os que gostar.

/* =========================================================
   1. DADOS
   ========================================================= */

// Quantos litros por kg de peso, para cada nível
var FATOR_NIVEL = {
  iniciante: 0.65,
  intermediario: 0.52,
  avancado: 0.42
};

var NOME_NIVEL = {
  iniciante: 'Iniciante',
  intermediario: 'Em evolução',
  avancado: 'Avançado'
};

// Cada modelo tem:
//  - mult: cada estilo tem um volume diferente. A litragem do modelo é a
//          litragem base do surfista x este número (ex: shortboard 0,85 = menos
//          volume; longboard 1,35 = muito mais volume)
//  - min/max: faixa de litragem em que o modelo faz sentido
//  - niveis: níveis de surf para os quais ele é indicado
//  - fc: quantas vezes a altura do surfista vale o comprimento da prancha
//  - larg / esp: largura e espessura (polegadas), do menor ao maior volume
//  - borda: como é a borda (lateral) da prancha
// (Valores de partida — devem ser confirmados com um shaper.)
var MODELOS = [
  { nome: 'Softboard', mult: 1.25, min: 30, max: 90, niveis: ['iniciante'],
    fc: 1.3, larg: [22, 24], esp: [2.9, 3.4], borda: 'grossa e arredondada (mais estável)',
    quilha: 'Single fin', descricao: 'Prancha de espuma, bem estável. Ideal para começar.' },
  { nome: 'Longboard', mult: 1.35, min: 40, max: 80, niveis: ['iniciante', 'intermediario'],
    fc: 1.55, larg: [22.5, 23.5], esp: [2.75, 3.1], borda: 'média, arredondada',
    quilha: 'Single fin', descricao: 'Comprida e com muita flutuação. Rema fácil e pega onda cedo.' },
  { nome: 'Funboard', mult: 1.1, min: 32, max: 60, niveis: ['iniciante', 'intermediario'],
    fc: 1.25, larg: [21.5, 22.5], esp: [2.5, 2.9], borda: 'média',
    quilha: 'Single fin ou Tri-fin', descricao: 'Volumosa e fácil de remar. Boa para evoluir.' },
  { nome: 'Evolution / Híbrida', mult: 1.0, min: 28, max: 42, niveis: ['intermediario', 'avancado'],
    fc: 1.1, larg: [20.25, 21.25], esp: [2.4, 2.6], borda: 'média',
    quilha: 'Tri-fin', descricao: 'Meio-termo entre funboard e shortboard.' },
  { nome: 'Fish', mult: 0.95, min: 26, max: 42, niveis: ['intermediario', 'avancado'],
    fc: 0.97, larg: [20.5, 22], esp: [2.3, 2.6], borda: 'média',
    quilha: 'Twin ou Quad', descricao: 'Curta e larga. Rápida em ondas pequenas.' },
  { nome: 'Shortboard', mult: 0.85, min: 20, max: 36, niveis: ['avancado'],
    fc: 1.03, larg: [18.5, 19.75], esp: [2.1, 2.4], borda: 'fina (mais manobrável)',
    quilha: 'Tri-fin', descricao: 'Prancha de performance para manobras radicais.' }
];

/* =========================================================
   2. CÁLCULO E VALIDAÇÃO
   ========================================================= */

// litragem = peso x fator do nível + ajuste pela altura (referência: 170 cm)
// Mesma entrada = sempre o mesmo resultado.
function calcularLitragem(peso, altura, nivel) {
  var litros = peso * FATOR_NIVEL[nivel] + (altura - 170) * 0.05;
  return Math.round(litros * 10) / 10;
}

// Calcula a litragem de CADA modelo (cada estilo tem um volume diferente) e
// devolve até 3 modelos que servem ao nível e cuja litragem cabe na faixa dele.
// Cada item devolvido tem o modelo e a litragem dele. Os mais "no meio" da faixa vêm primeiro.
function buscarModelos(litrosBase, nivel) {
  var compativeis = [];
  for (var i = 0; i < MODELOS.length; i++) {
    var m = MODELOS[i];
    var litros = Math.round(litrosBase * m.mult * 10) / 10;
    if (litros >= m.min && litros <= m.max && m.niveis.indexOf(nivel) !== -1) {
      compativeis.push({ modelo: m, litros: litros });
    }
  }
  compativeis.sort(function (a, b) {
    var distA = Math.abs(a.litros - (a.modelo.min + a.modelo.max) / 2);
    var distB = Math.abs(b.litros - (b.modelo.min + b.modelo.max) / 2);
    return distA - distB;
  });
  return compativeis.slice(0, 3);
}

// Arredonda para o quarto de polegada mais próximo e usa vírgula (ex: 20,5)
function formatarPol(valor) {
  return String(Math.round(valor * 4) / 4).replace('.', ',');
}

// Calcula o tamanho da prancha para o surfista:
//  - comprimento: altura x fator do modelo (em pés e polegadas, como no surf)
//  - largura e espessura: crescem junto com a litragem dentro da faixa do modelo
function medidasDoModelo(modelo, litros, altura) {
  // comprimento em polegadas, arredondado para número par (padrão das pranchas)
  var polTotal = Math.round((altura * modelo.fc / 2.54) / 2) * 2;
  var pes = Math.floor(polTotal / 12);
  var pol = polTotal % 12;

  // posição da litragem dentro da faixa do modelo (0 = mínimo, 1 = máximo)
  var posicao = (litros - modelo.min) / (modelo.max - modelo.min);
  if (posicao < 0) { posicao = 0; }
  if (posicao > 1) { posicao = 1; }

  var largura = modelo.larg[0] + (modelo.larg[1] - modelo.larg[0]) * posicao;
  var espessura = modelo.esp[0] + (modelo.esp[1] - modelo.esp[0]) * posicao;

  return {
    comprimento: pes + "'" + pol + '"',
    comprimentoCm: Math.round(polTotal * 2.54),
    largura: formatarPol(largura),
    larguraCm: Math.round(largura * 2.54),
    espessura: formatarPol(espessura),
    espessuraCm: (Math.round(espessura * 2.54 * 10) / 10).toString().replace('.', ','),
    borda: modelo.borda
  };
}

// Devolve um objeto com as mensagens de erro (vazio = tudo certo)
function validar(peso, altura, nivel) {
  var erros = {};

  if (peso === '') {
    erros.peso = 'Informe seu peso.';
  } else if (Number(peso) < 20 || Number(peso) > 200) {
    erros.peso = 'O peso deve estar entre 20 e 200 kg.';
  }

  if (altura === '') {
    erros.altura = 'Informe sua altura.';
  } else if (Number(altura) < 100 || Number(altura) > 220) {
    erros.altura = 'A altura deve estar entre 100 e 220 cm.';
  }

  if (nivel === '') {
    erros.nivel = 'Escolha seu nível.';
  }
  return erros;
}

/* =========================================================
   3. PRANCHAS SALVAS (CRUD no localStorage)
   Create = salvar | Read = listar | Update = editar nota | Delete = excluir
   ========================================================= */

var CHAVE = 'boardfit.salvas';

function lerSalvas() {
  try {
    var texto = localStorage.getItem(CHAVE);
    return texto ? JSON.parse(texto) : [];
  } catch (erro) {
    return [];
  }
}

function gravarSalvas(lista) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch (erro) {
    alert('Não foi possível salvar neste navegador.');
  }
}

function salvarPrancha(modelo, litros, nivel, tamanho) {
  var lista = lerSalvas();
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].modelo === modelo.nome && lista[i].litros === litros && lista[i].tamanho === tamanho) {
      return false; // já estava salva
    }
  }
  lista.push({ id: Date.now(), modelo: modelo.nome, litros: litros, nivel: nivel, tamanho: tamanho, nota: '' });
  gravarSalvas(lista);
  return true;
}

function atualizarNota(id, nota) {
  var lista = lerSalvas();
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === id) { lista[i].nota = nota; }
  }
  gravarSalvas(lista);
}

function excluirPrancha(id) {
  var lista = lerSalvas().filter(function (item) { return item.id !== id; });
  gravarSalvas(lista);
}

/* =========================================================
   4. TELA (DOM e eventos)
   ========================================================= */

var form = document.getElementById('calc-form');
var areaResultado = document.getElementById('resultado');
var areaSalvas = document.getElementById('lista-salvas');
var avisoSalvas = document.getElementById('aviso-salvas');

var ultimaLitragem = 0;
var ultimoNivel = '';

// Cria um elemento com texto (textContent evita problemas com texto digitado)
function criar(tag, classe, texto) {
  var e = document.createElement(tag);
  if (classe) { e.className = classe; }
  if (texto) { e.textContent = texto; }
  return e;
}

function formatarLitros(valor) {
  return String(valor).replace('.', ',') + ' L';
}

function mostrarErro(campo, mensagem) {
  document.getElementById('erro-' + campo).textContent = mensagem || '';
  document.getElementById(campo).classList.toggle('invalido', Boolean(mensagem));
}

// ---- resultado da calculadora ----
function mostrarResultado(litrosBase, nivel, altura) {
  var modelos = buscarModelos(litrosBase, nivel);
  areaResultado.innerHTML = '';
  areaResultado.classList.add('visivel');

  if (modelos.length === 0) {
    areaResultado.appendChild(criar('p', 'resultado__aviso',
      'Não encontramos um modelo compatível com esses dados. Confira os valores informados.'));
    return;
  }

  areaResultado.appendChild(criar('h3', null, 'Modelos compatíveis com você'));
  areaResultado.appendChild(criar('p', 'resultado__rotulo',
    'Cada estilo de prancha tem um volume diferente, por isso cada modelo tem a sua litragem.'));
  var grade = criar('div', 'modelos');

  modelos.forEach(function (item, posicao) {
    var m = item.modelo;
    var litros = item.litros;
    var card = criar('div', 'modelo');
    if (posicao === 0) { card.appendChild(criar('span', 'modelo__selo', 'Melhor encaixe')); }
    card.appendChild(criar('h4', null, m.nome));
    card.appendChild(criar('p', 'modelo__litros', formatarLitros(litros)));
    card.appendChild(criar('p', null, m.descricao));

    // medidas da prancha para este surfista
    var med = medidasDoModelo(m, litros, altura);
    var tabela = criar('ul', 'medidas');
    tabela.appendChild(criar('li', null, 'Tamanho: ' + med.comprimento + ' (≈ ' + med.comprimentoCm + ' cm)'));
    tabela.appendChild(criar('li', null, 'Largura: ' + med.largura + ' pol (≈ ' + med.larguraCm + ' cm)'));
    tabela.appendChild(criar('li', null, 'Espessura: ' + med.espessura + ' pol (≈ ' + med.espessuraCm + ' cm)'));
    tabela.appendChild(criar('li', null, 'Borda: ' + med.borda));
    tabela.appendChild(criar('li', null, 'Quilha: ' + m.quilha));
    card.appendChild(tabela);

    var botao = criar('button', 'btn btn--pequeno', 'Salvar este modelo');
    botao.type = 'button';
    botao.addEventListener('click', function () {
      var salvou = salvarPrancha(m, litros, nivel, med.comprimento);
      avisoSalvas.textContent = salvou ? m.nome + ' salva na sua lista.' : m.nome + ' já está na sua lista.';
      mostrarSalvas();
    });
    card.appendChild(botao);
    grade.appendChild(card);
  });
  areaResultado.appendChild(grade);
}

// ---- lista de pranchas salvas ----
function mostrarSalvas() {
  var lista = lerSalvas();
  areaSalvas.innerHTML = '';

  if (lista.length === 0) {
    areaSalvas.appendChild(criar('p', 'vazio', 'Você ainda não salvou nenhuma prancha.'));
    return;
  }

  lista.forEach(function (item) {
    var linha = criar('div', 'salva');
    var titulo = item.modelo + ' · ' + formatarLitros(item.litros);
    if (item.tamanho) { titulo = item.modelo + ' ' + item.tamanho + ' · ' + formatarLitros(item.litros); }
    linha.appendChild(criar('strong', null, titulo));
    linha.appendChild(criar('span', 'salva__nivel', 'Nível: ' + NOME_NIVEL[item.nivel]));

    var campoNota = criar('input');
    campoNota.type = 'text';
    campoNota.value = item.nota;
    campoNota.placeholder = 'Anotação (ex: ver na loja X)';
    campoNota.maxLength = 80;
    campoNota.setAttribute('aria-label', 'Anotação sobre ' + item.modelo);
    linha.appendChild(campoNota);

    var botoes = criar('div', 'salva__botoes');

    var btnNota = criar('button', 'btn btn--pequeno', 'Salvar anotação');
    btnNota.type = 'button';
    btnNota.addEventListener('click', function () {
      atualizarNota(item.id, campoNota.value.trim());
      avisoSalvas.textContent = 'Anotação atualizada.';
    });

    var btnExcluir = criar('button', 'btn btn--pequeno btn--contorno', 'Excluir');
    btnExcluir.type = 'button';
    btnExcluir.addEventListener('click', function () {
      excluirPrancha(item.id);
      avisoSalvas.textContent = 'Prancha removida.';
      mostrarSalvas();
    });

    botoes.appendChild(btnNota);
    botoes.appendChild(btnExcluir);
    linha.appendChild(botoes);
    areaSalvas.appendChild(linha);
  });
}

// ---- envio do formulário ----
form.addEventListener('submit', function (evento) {
  evento.preventDefault();

  var peso = document.getElementById('peso').value.trim();
  var altura = document.getElementById('altura').value.trim();
  var nivel = document.getElementById('nivel').value;

  var erros = validar(peso, altura, nivel);
  mostrarErro('peso', erros.peso);
  mostrarErro('altura', erros.altura);
  mostrarErro('nivel', erros.nivel);

  if (erros.peso || erros.altura || erros.nivel) {
    areaResultado.classList.remove('visivel');
    return;
  }

  ultimaLitragem = calcularLitragem(Number(peso), Number(altura), nivel);
  ultimoNivel = nivel;
  mostrarResultado(ultimaLitragem, ultimoNivel, Number(altura));
});

// ---- botão Limpar ----
form.addEventListener('reset', function () {
  mostrarErro('peso', '');
  mostrarErro('altura', '');
  mostrarErro('nivel', '');
  areaResultado.classList.remove('visivel');
});

// Mostra a lista salva assim que a página abre
mostrarSalvas();
