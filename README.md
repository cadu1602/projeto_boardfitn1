# BoardFit — O seu Shaper Virtual 🏄

> Informe peso, altura e nível de surf e descubra a litragem ideal e os modelos de prancha que combinam com você.

## 📌 Sobre o projeto

Muitos surfistas em evolução não sabem escolher a prancha certa e acabam comprando por indicação de vendedor ou de amigo. O **BoardFit** é um "shaper virtual": o usuário informa **peso, altura e nível**, o sistema calcula a **litragem ideal** e mostra **até 3 modelos de prancha compatíveis**, com a quilha recomendada. Não precisa de cadastro.

## 🚀 Sprint 2 — Evolução com JavaScript

| Requisito | Como foi feito |
|---|---|
| Páginas organizadas e responsivas | `boardfit.html` + `style.css`, feitos primeiro para celular e ajustados a partir de 768px |
| Manipulação do DOM | O resultado e a lista de pranchas são criados com `createElement` |
| Eventos | `submit` e `reset` do formulário, `click` nos botões de salvar, anotar e excluir |
| Validação de formulário | Peso (20–200 kg), altura (100–220 cm) e nível obrigatórios, com mensagem em cada campo |
| CRUD local | **Minhas pranchas**: salvar um modelo (Create), listar (Read), editar anotação (Update) e excluir (Delete), tudo no `localStorage` |

### Como o cálculo funciona

1. Litragem base do surfista: `peso × fator do nível + (altura − 170) × 0,05`
2. Cada estilo de prancha tem um volume diferente, então a **litragem de cada modelo** é a litragem base × um número do modelo (ex: shortboard 0,85 e funboard 1,1). Por isso Fish, Funboard e Evolution nunca têm a mesma litragem.
3. O sistema escolhe os modelos que servem ao nível do usuário e cuja litragem cabe na faixa do modelo, e mostra até **3**, o mais bem encaixado primeiro.
4. Para cada modelo, calcula as **medidas da prancha**:
   - **Tamanho (comprimento):** altura do surfista × um fator do modelo, em pés e polegadas (ex: 6'4").
   - **Largura e espessura:** crescem junto com a litragem dentro da faixa do modelo (em polegadas e cm).
   - **Borda:** fina, média ou grossa, conforme o modelo.

A mesma entrada sempre dá o mesmo resultado.

> ⚠️ Os fatores e as faixas de litragem são valores de partida e precisam ser confirmados com um shaper.

## 🛠️ Tecnologias

HTML5 · CSS3 · JavaScript puro · `localStorage` · Google Fonts

## ▶️ Como abrir

Não precisa instalar nada. Baixe o projeto e abra `boardfit.html` no navegador.

## 📁 Estrutura

```
boardfit/
├── boardfit.html   # Página com a calculadora e a lista de pranchas salvas
├── style.css       # Estilos
├── app.js          # Cálculo, validação, DOM, eventos e CRUD
└── README.md
```

## 🧪 Como testar

1. Clique em **Calcular** sem preencher: aparecem as mensagens de erro.
2. Informe 70 kg, 175 cm, Em evolução: 3 modelos (Evolution / Híbrida 36,7 L, Fish 34,9 L e Funboard 40,4 L), cada um com tamanho, largura, espessura, borda e quilha.
3. Clique em **Salvar este modelo**, escreva uma anotação, salve a anotação e exclua a prancha.
4. Recarregue a página: as pranchas salvas continuam lá.
5. Diminua a janela do navegador para o tamanho de um celular: o layout se ajusta.

## 👥 Equipe

Caio Marçal · Carlos Eduardo · Simon Pais · Matheus Nicolai
