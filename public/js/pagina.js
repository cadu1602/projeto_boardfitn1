// pagina.js — tela da calculadora: DOM e eventos
// Pede os dados ao api.js e ao crud.js, valida com validacao.js e
// calcula as medidas com medidas.js.

var form = document.getElementById('calc-form');
var areaResultado = document.getElementById('resultado');
var areaSalvas = document.getElementById('lista-salvas');
var avisoSalvas = document.getElementById('aviso-salvas');
var campoNivel = document.getElementById('nivel');

var niveis = [];  // [{ id, nome }] vindos da API
var modelos = []; // [{ id, nome }] vindos da API (usados ao editar uma prancha salva)

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

function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarErro(campo, mensagem) {
  document.getElementById('erro-' + campo).textContent = mensagem || '';
  document.getElementById(campo).classList.toggle('invalido', Boolean(mensagem));
}

// Texto curto para mostrar quando uma chamada à API falha
function textoDoErro(erro) {
  return erro.status ? erro.message : 'Sem conexão com o servidor.';
}

// ---- níveis e modelos (vêm do banco) ----
async function carregarListas() {
  try {
    var resultado = await Promise.all([buscarNiveis(), buscarModelos()]);
    niveis = resultado[0];
    modelos = resultado[1];
  } catch (erro) {
    if (location.protocol === 'file:' || erro.status === 404) {
      mostrarErro('nivel', 'Endereço errado: abra http://localhost:3000/calculadora.html');
    } else if (erro.status) {
      mostrarErro('nivel', 'O servidor respondeu com erro ' + erro.status + '. Veja o terminal dele.');
    } else {
      mostrarErro('nivel', 'Não foi possível falar com o servidor. Ele está rodando?');
    }
    return;
  }
  niveis.forEach(function (n) {
    var op = criar('option', null, n.nome);
    op.value = n.id;
    campoNivel.appendChild(op);
  });
}

// ---- resultado da calculadora ----
function criarOferta(oferta, consultaId, statusEl) {
  var li = criar('li', null, oferta.loja + ' · ' + formatarPreco(oferta.preco));
  var botao = criar('button', 'btn btn--pequeno btn--contorno', 'Ver na loja');
  botao.type = 'button';
  botao.addEventListener('click', async function () {
    // abre a aba já no clique (senão o navegador pode bloquear o pop-up)
    var aba = window.open('', '_blank');
    try {
      var resposta = await registrarClique(oferta.id, consultaId);
      if (aba) { aba.opener = null; aba.location.href = resposta.url; }
      else { window.location.href = resposta.url; }
      statusEl.textContent = '';
    } catch (erro) {
      if (aba) { aba.close(); }
      statusEl.textContent = 'Essa oferta não está mais disponível.';
    }
  });
  li.appendChild(botao);
  return li;
}

function criarCardModelo(m, litros, altura, nivelId, consultaId, selo) {
  var card = criar('div', 'modelo');
  if (selo) { card.appendChild(criar('span', 'modelo__selo', selo)); }
  card.appendChild(criar('h4', null, m.nome));
  card.appendChild(criar('p', 'modelo__litros', formatarLitros(litros)));
  card.appendChild(criar('p', null, m.descricao));

  // onde a litragem do surfista fica na faixa do modelo
  var faixa = criar('div', 'faixa');
  faixa.appendChild(criar('span', 'faixa__rotulo',
    'Faixa deste modelo: ' + formatarLitros(m.faixaLitragem.min) + ' a ' + formatarLitros(m.faixaLitragem.max)));
  var barra = criar('div', 'faixa__barra');
  var marcador = criar('span', 'faixa__marcador');
  var pct = (litros - m.faixaLitragem.min) / (m.faixaLitragem.max - m.faixaLitragem.min) * 100;
  marcador.style.left = Math.max(0, Math.min(100, pct)) + '%';
  barra.appendChild(marcador);
  faixa.appendChild(barra);
  card.appendChild(faixa);

  // medidas da prancha para este surfista (se o modelo tiver medidas cadastradas)
  var med = medidasDoModelo(m.nome, m.faixaLitragem, litros, altura);
  var tabela = criar('ul', 'medidas');
  if (med) {
    tabela.appendChild(criar('li', null, 'Tamanho: ' + med.comprimento + ' (≈ ' + med.comprimentoCm + ' cm)'));
    tabela.appendChild(criar('li', null, 'Largura: ' + med.largura + ' pol (≈ ' + med.larguraCm + ' cm)'));
    tabela.appendChild(criar('li', null, 'Espessura: ' + med.espessura + ' pol (≈ ' + med.espessuraCm + ' cm)'));
    tabela.appendChild(criar('li', null, 'Borda: ' + med.borda));
  }
  var quilha = m.quilhas.padrao ? m.quilhas.padrao.nome : 'não informada';
  if (m.quilhas.alternativas.length > 0) {
    quilha += ' (também: ' + m.quilhas.alternativas.map(function (q) { return q.nome; }).join(', ') + ')';
  }
  tabela.appendChild(criar('li', null, 'Quilha: ' + quilha));
  card.appendChild(tabela);

  // onde comprar (RF-005 / RF-006): a API já devolve na ordem certa
  var status = criar('p', 'modelo__info');
  status.setAttribute('role', 'status');
  card.appendChild(criar('p', 'modelo__info', 'Onde comprar'));
  if (m.ofertas.length === 0) {
    card.appendChild(criar('p', 'modelo__info', 'Nenhuma loja disponível no momento.'));
  } else {
    var listaOfertas = criar('ul', 'medidas ofertas');
    m.ofertas.forEach(function (o) {
      listaOfertas.appendChild(criarOferta(o, consultaId, status));
    });
    card.appendChild(listaOfertas);
  }
  card.appendChild(status);

  var botao = criar('button', 'btn btn--pequeno', 'Salvar este modelo');
  botao.type = 'button';
  botao.addEventListener('click', async function () {
    try {
      var salvou = await salvarPrancha({
        modeloId: m.id,
        nivelId: nivelId,
        litragem: litros,
        tamanho: med ? med.comprimento : '',
        nota: ''
      });
      avisoSalvas.textContent = salvou ? m.nome + ' salva na sua lista.' : m.nome + ' já está na sua lista.';
      await mostrarSalvas();
    } catch (erro) {
      avisoSalvas.textContent = 'Não foi possível salvar: ' + textoDoErro(erro);
    }
  });
  card.appendChild(botao);
  return card;
}

function mostrarResultado(dados, altura, nivelId) {
  areaResultado.innerHTML = '';
  areaResultado.classList.add('visivel');

  if (!dados.recomendacao) {
    areaResultado.appendChild(criar('p', 'resultado__aviso',
      dados.mensagem || 'Não encontramos um modelo compatível com esses dados. Confira os valores informados.'));
    return;
  }

  areaResultado.appendChild(criar('h3', null, 'Sua litragem ideal: ' + formatarLitros(dados.litragem)));
  areaResultado.appendChild(criar('p', 'resultado__rotulo',
    'Modelos compatíveis com o seu nível e com essa litragem.'));

  var grade = criar('div', 'modelos');
  grade.appendChild(criarCardModelo(dados.recomendacao, dados.litragem, altura, nivelId, dados.consultaId, 'Melhor encaixe'));
  if (dados.alternativa) {
    grade.appendChild(criarCardModelo(dados.alternativa, dados.litragem, altura, nivelId, dados.consultaId, 'Alternativa'));
  }
  areaResultado.appendChild(grade);
}

function mostrarFalha(mensagem) {
  areaResultado.innerHTML = '';
  areaResultado.classList.add('visivel');
  areaResultado.appendChild(criar('p', 'resultado__aviso', mensagem));
}

// ---- lista de pranchas salvas (vem do banco) ----
// Monta o corpo do PUT com os dados atuais da prancha, trocando só o que mudou
function dadosDaPrancha(item, mudancas) {
  var dados = {
    modeloId: item.modeloId,
    nivelId: item.nivelId,
    litragem: item.litragem,
    tamanho: item.tamanho,
    nota: item.nota
  };
  for (var campo in mudancas) { dados[campo] = mudancas[campo]; }
  return dados;
}

async function mostrarSalvas() {
  var lista;
  try {
    lista = await lerSalvas();
  } catch (erro) {
    areaSalvas.innerHTML = '';
    areaSalvas.appendChild(criar('p', 'vazio', 'Não foi possível carregar suas pranchas. ' + textoDoErro(erro)));
    return;
  }
  areaSalvas.innerHTML = '';

  if (lista.length === 0) {
    areaSalvas.appendChild(criar('p', 'vazio', 'Você ainda não salvou nenhuma prancha.'));
    return;
  }

  lista.forEach(function (item) {
    var linha = criar('div', 'salva');
    var titulo = item.modelo + ' · ' + formatarLitros(item.litragem);
    if (item.tamanho) { titulo = item.modelo + ' ' + item.tamanho + ' · ' + formatarLitros(item.litragem); }
    linha.appendChild(criar('strong', null, titulo));
    linha.appendChild(criar('span', 'salva__nivel', 'Nível: ' + item.nivel));

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
    btnNota.addEventListener('click', async function () {
      try {
        await atualizarPrancha(item.id, dadosDaPrancha(item, { nota: campoNota.value.trim() }));
        avisoSalvas.textContent = 'Anotação atualizada.';
      } catch (erro) {
        avisoSalvas.textContent = 'Não foi possível atualizar: ' + textoDoErro(erro);
      }
    });

    var btnEditar = criar('button', 'btn btn--pequeno btn--contorno', 'Editar');
    btnEditar.type = 'button';
    btnEditar.addEventListener('click', function () {
      mostrarEdicao(linha, item);
    });

    var btnExcluir = criar('button', 'btn btn--pequeno btn--contorno', 'Excluir');
    btnExcluir.type = 'button';
    btnExcluir.addEventListener('click', async function () {
      try {
        await excluirPrancha(item.id);
        avisoSalvas.textContent = 'Prancha removida.';
        await mostrarSalvas();
      } catch (erro) {
        avisoSalvas.textContent = 'Não foi possível excluir: ' + textoDoErro(erro);
      }
    });

    botoes.appendChild(btnNota);
    botoes.appendChild(btnEditar);
    botoes.appendChild(btnExcluir);
    linha.appendChild(botoes);
    areaSalvas.appendChild(linha);
  });
}

// ---- edição de uma prancha salva ----
// Troca o conteúdo da linha por um mini formulário já preenchido.
function criarCampo(rotulo, elemento, id) {
  var campo = criar('div', 'salva__campo');
  var label = criar('label', null, rotulo);
  label.setAttribute('for', id);
  elemento.id = id;
  campo.appendChild(label);
  campo.appendChild(elemento);
  var erro = criar('span', 'erro');
  campo.appendChild(erro);
  return { campo: campo, entrada: elemento, erro: erro };
}

// Monta um <select> com as opções { id, nome } e deixa marcada a atual
function criarSelect(opcoes, idAtual) {
  var sel = document.createElement('select');
  opcoes.forEach(function (o) {
    var op = criar('option', null, o.nome);
    op.value = o.id;
    sel.appendChild(op);
  });
  sel.value = String(idAtual);
  return sel;
}

function mostrarEdicao(linha, item) {
  linha.innerHTML = '';
  linha.classList.add('salva--editando');

  // modelo
  var selModelo = criarSelect(modelos, item.modeloId);
  var fModelo = criarCampo('Modelo', selModelo, 'edit-modelo-' + item.id);

  // tamanho (ex: 6'4")
  var inTamanho = criar('input');
  inTamanho.type = 'text';
  inTamanho.value = item.tamanho || '';
  inTamanho.maxLength = 10;
  inTamanho.placeholder = 'Ex: 6\'4"';
  var fTamanho = criarCampo('Tamanho', inTamanho, 'edit-tamanho-' + item.id);

  // litragem
  var inLitros = criar('input');
  inLitros.type = 'number';
  inLitros.step = '0.1';
  inLitros.value = item.litragem;
  var fLitros = criarCampo('Litragem (L)', inLitros, 'edit-litros-' + item.id);

  // nível
  var selNivel = criarSelect(niveis, item.nivelId);
  var fNivel = criarCampo('Nível', selNivel, 'edit-nivel-' + item.id);

  // anotação
  var inNota = criar('input');
  inNota.type = 'text';
  inNota.maxLength = 80;
  inNota.value = item.nota;
  inNota.placeholder = 'Anotação (ex: ver na loja X)';
  var fNota = criarCampo('Anotação', inNota, 'edit-nota-' + item.id);

  [fModelo, fTamanho, fLitros, fNivel, fNota].forEach(function (f) {
    linha.appendChild(f.campo);
  });

  var botoes = criar('div', 'salva__botoes');

  var btnSalvar = criar('button', 'btn btn--pequeno', 'Salvar');
  btnSalvar.type = 'button';
  btnSalvar.addEventListener('click', async function () {
    var litros = Number(inLitros.value);
    fLitros.erro.textContent = '';
    fModelo.erro.textContent = '';
    inLitros.classList.remove('invalido');

    if (inLitros.value.trim() === '' || litros < 10 || litros > 120) {
      fLitros.erro.textContent = 'A litragem deve estar entre 10 e 120 L.';
      inLitros.classList.add('invalido');
      return;
    }

    try {
      await atualizarPrancha(item.id, {
        modeloId: Number(selModelo.value),
        nivelId: Number(selNivel.value),
        litragem: Math.round(litros * 10) / 10,
        tamanho: inTamanho.value.trim(),
        nota: inNota.value.trim()
      });
      avisoSalvas.textContent = 'Prancha atualizada.';
      await mostrarSalvas();
    } catch (erro) {
      if (erro.status === 409) {
        fModelo.erro.textContent = 'Já existe uma prancha igual na sua lista.';
      } else {
        avisoSalvas.textContent = 'Não foi possível atualizar: ' + textoDoErro(erro);
      }
    }
  });

  var btnCancelar = criar('button', 'btn btn--pequeno btn--contorno', 'Cancelar');
  btnCancelar.type = 'button';
  btnCancelar.addEventListener('click', function () {
    avisoSalvas.textContent = '';
    mostrarSalvas();
  });

  botoes.appendChild(btnSalvar);
  botoes.appendChild(btnCancelar);
  linha.appendChild(botoes);
  inTamanho.focus();
}

// ---- envio do formulário ----
form.addEventListener('submit', async function (evento) {
  evento.preventDefault();

  var peso = document.getElementById('peso').value.trim();
  var altura = document.getElementById('altura').value.trim();
  var nivel = campoNivel.value;

  var erros = validar(peso, altura, nivel);
  mostrarErro('peso', erros.peso);
  mostrarErro('altura', erros.altura);
  mostrarErro('nivel', erros.nivel);

  if (erros.peso || erros.altura || erros.nivel) {
    areaResultado.classList.remove('visivel');
    return;
  }

  var botaoEnviar = form.querySelector('button[type="submit"]');
  botaoEnviar.disabled = true;
  try {
    var dados = await buscarRecomendacao(Number(peso), Number(altura), Number(nivel));
    mostrarResultado(dados, Number(altura), Number(nivel));
  } catch (erro) {
    if (erro.status === 400 && erro.detalhes) {
      // o servidor recusou algum campo: mostra a mensagem dele no campo certo
      mostrarErro('peso', erro.detalhes.pesoKg);
      mostrarErro('altura', erro.detalhes.alturaCm);
      mostrarErro('nivel', erro.detalhes.nivelId);
      areaResultado.classList.remove('visivel');
    } else if (erro.status) {
      mostrarFalha(erro.message);
    } else {
      mostrarFalha('Não foi possível falar com o servidor. Confira se ele está rodando e tente de novo.');
    }
  } finally {
    botaoEnviar.disabled = false;
  }
});

// ---- botão Limpar ----
form.addEventListener('reset', function () {
  mostrarErro('peso', '');
  mostrarErro('altura', '');
  mostrarErro('nivel', '');
  areaResultado.classList.remove('visivel');
});

// Ao abrir a página: carrega níveis e modelos do banco e mostra as pranchas salvas
carregarListas();
mostrarSalvas();
