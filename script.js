// script.js - BoardFit Shaper Virtual (Simon Pais)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-boardfit');
    const resultContainer = document.getElementById('resultado-container');

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Evita recarregar a página

            const nome = document.getElementById('nome').value.trim();
            const peso = parseFloat(document.getElementById('peso').value);
            const altura = parseFloat(document.getElementById('altura').value);
            const nivel = document.getElementById('nivel').value;

            // Validação de formulário
            if (!nome || isNaN(peso) || peso <= 30 || peso > 150 || isNaN(altura)) {
                alert('Por favor, preencha todos os campos corretamente (peso entre 30kg e 150kg).');
                return;
            }

            // Lógica de cálculo determinístico da litragem por nível
            let fator = 0.40; // Iniciante
            if (nivel === 'intermediario') fator = 0.35;
            if (nivel === 'avancado') fator = 0.30;

            const litragem = (peso * fator).toFixed(1);

            // Manipulação do DOM para exibir o resultado dinamicamente
            resultContainer.innerHTML = `
                <div style="background: #e0fbfc; padding: 1.2rem; border-radius: 6px; border-left: 5px solid #0096c7;">
                    <h3 style="color: #03045e; margin-bottom: 0.5rem;">Diagnóstico para ${nome}</h3>
                    <p><strong>Litragem Recomendada:</strong> ${litragem} Litros</p>
                    <p><strong>Altura Informada:</strong> ${altura} cm</p>
                    <p><strong>Perfil Técnico:</strong> ${nivel.toUpperCase()}</p>
                    <span style="display:inline-block; margin-top: 0.5rem; color: #2a9d8f; font-weight: bold;">Cálculo e validação efetuados com sucesso!</span>
                </div>
            `;

            // Armazenamento local (localStorage)
            const dados = { nome, peso, altura, nivel, litragem, data: new Date().toLocaleDateString('pt-BR') };
            localStorage.setItem('boardFit_ultimoCalculo', JSON.stringify(dados));
        });
    }
});
