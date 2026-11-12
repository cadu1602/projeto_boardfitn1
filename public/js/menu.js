// BoardFit — abre e fecha o menu no celular
(function () {
  var botao = document.getElementById('menu-toggle');
  var menu = document.getElementById('menu');
  if (!botao || !menu) { return; }

  function definir(aberto) {
    menu.classList.toggle('aberto', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  }

  botao.addEventListener('click', function () {
    definir(!menu.classList.contains('aberto'));
  });

  // fecha o menu ao escolher um link
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { definir(false); }
  });
})();
