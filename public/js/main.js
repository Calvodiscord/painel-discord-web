document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const menuToggle = document.querySelector('.menu-toggle');
    const overlay = document.querySelector('.overlay');

    if (!sidebarContainer) return;

    // Constrói a barra lateral (código anterior)
    const currentPage = window.location.pathname;
    const serverName = "TURMA DA MÔNICA";
    const serverIcon = "https://i.imgur.com/link-do-seu-icone.png"; // Troque pelo link real

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
    sidebarContainer.innerHTML = sidebarHTML;

    // NOVA LÓGICA: Controla a abertura/fechamento do menu mobile
    function toggleMenu() {
        sidebarContainer.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    if (menuToggle && overlay) {
        // Clicar no botão hambúrguer abre/fecha o menu
        menuToggle.addEventListener('click', toggleMenu);
        // Clicar no fundo escuro (overlay) fecha o menu
        overlay.addEventListener('click', toggleMenu);
    }
});