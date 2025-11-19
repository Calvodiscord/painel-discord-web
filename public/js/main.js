document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return; // Se o container da sidebar não existir na página, o script para.

    // Pega o caminho da URL atual para saber qual link do menu deve ser marcado como "ativo"
    const currentPage = window.location.pathname;
    
    // ATENÇÃO: Troque os valores abaixo pelos dados do seu servidor.
    // Você pode pegar o link do ícone clicando com o botão direito no ícone do seu servidor no Discord e "Copiar Link da Imagem".
    const serverName = "TURMA DA MÔNICA";
    const serverIcon = "https://cdn.discordapp.com/icons/1437362647690383402/a_example.png"; // Troque pelo link real

    // O HTML completo da barra lateral, com ícones da Font Awesome
    const sidebarHTML = `
        <div class="sidebar-header">
            <img src="${serverIcon}" alt="Ícone do Servidor">
            <h2>${serverName}</h2>
        </div>
        <nav class="sidebar-nav">
            <div class="nav-group">
                <h3>GERAL</h3>
                <a href="/comandos.html" class="${currentPage.includes('comandos') ? 'active' : ''}">
                    <i class="fa-solid fa-terminal"></i> Comandos
                </a>
            </div>
            <div class="nav-group">
                <h3>MODERAÇÃO</h3>
                <a href="/punir.html" class="${currentPage.includes('punir') ? 'active' : ''}">
                    <i class="fa-solid fa-gavel"></i> Punições
                </a>
            </div>
            <div class="nav-group">
                <h3>UTILITÁRIOS</h3>
                <a href="/ticket.html" class="${currentPage.includes('ticket') ? 'active' : ''}">
                    <i class="fa-solid fa-life-ring"></i> Tickets
                </a>
            </div>
            <div class="nav-group">
                <h3>ADMIN</h3>
                <a href="/config.html" class="${currentPage.includes('config') ? 'active' : ''}">
                    <i class="fa-solid fa-gears"></i> Configurações
                </a>
            </div>
        </nav>
        <div class="sidebar-footer">
            <a href="/logout"><i class="fa-solid fa-right-from-bracket"></i> Sair</a>
        </div>
    `;

    // Insere o HTML da barra lateral no elemento <aside> da página.
    sidebarContainer.innerHTML = sidebarHTML;
});