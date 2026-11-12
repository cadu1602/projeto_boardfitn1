// medidas.js — medidas sugeridas da prancha (tamanho, largura, espessura e borda)
// O banco de dados ainda não guarda essas medidas, então elas ficam aqui,
// usando o NOME do modelo igual ao da tabela modelo_prancha.
//  - fc: quantas vezes a altura do surfista vale o comprimento da prancha
//  - larg / esp: largura e espessura (polegadas), do menor ao maior volume
// (Valores de partida — devem ser confirmados com um shaper.)
var MEDIDAS = {
  'Softboard':              { fc: 1.3,  larg: [22, 24],       esp: [2.9, 3.4], borda: 'grossa e arredondada (mais estável)' },
  'Funboard':               { fc: 1.25, larg: [21.5, 22.5],   esp: [2.5, 2.9], borda: 'média' },
  'Evolution / Híbrida':    { fc: 1.1,  larg: [20.25, 21.25], esp: [2.4, 2.6], borda: 'média' },
  'Fish':                   { fc: 0.97, larg: [20.5, 22],     esp: [2.3, 2.6], borda: 'média' },
  'Shortboard performance': { fc: 1.03, larg: [18.5, 19.75], esp: [2.1, 2.4], borda: 'fina (mais manobrável)' }
};

// Arredonda para o quarto de polegada mais próximo e usa vírgula (ex: 20,5)
function formatarPol(valor) {
  return String(Math.round(valor * 4) / 4).replace('.', ',');
}

// Calcula as medidas da prancha para o surfista (ou null se o modelo não tem medidas):
//  - comprimento: altura x fator do modelo (em pés e polegadas, como no surf)
//  - largura e espessura: crescem junto com a litragem dentro da faixa do modelo
// "faixa" é a faixaLitragem { min, max } que a API devolve para o modelo.
function medidasDoModelo(nomeModelo, faixa, litros, altura) {
  var modelo = MEDIDAS[nomeModelo];
  if (!modelo) { return null; }

  // comprimento em polegadas, arredondado para número par (padrão das pranchas)
  var polTotal = Math.round((altura * modelo.fc / 2.54) / 2) * 2;
  var pes = Math.floor(polTotal / 12);
  var pol = polTotal % 12;

  // posição da litragem dentro da faixa do modelo (0 = mínimo, 1 = máximo)
  var posicao = (litros - faixa.min) / (faixa.max - faixa.min);
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
