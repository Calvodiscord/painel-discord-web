document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        // O caminho para a logo. Crie uma pasta 'img' em 'public' e coloque sua logo lá.
        const logoUrl = '/img/logo.png'; 

        const sidebarHTML = `
            <div class="sidebar-header">
                <img src="${logoUrl}" alt="Logo do Servidor">
                <h2>Painel de Controle</h2>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-group">
                    <h3>Principal</h3>
                    <a href="/punir.html" class="nav-item" id="nav-punir"><i class="fa-solid fa-gavel"></i> Início</a>
                    <a href="/comandos.html" class="nav-item" id="nav-comandos"><i class="fa-solid fa-terminal"></i> Comandos</a>
                </div>
                <div class="nav-group">
                    <h3>Gerenciamento</h3>
                    <a href="/config.html" class="nav-item" id="nav-config"><i class="fa-solid fa-sliders"></i> Configurações</a>
                    <a href="/ticket.html" class="nav-item" id="nav-ticket"><i class="fa-solid fa-ticket"></i> Tickets</a>
                </div>
            </nav>
            <div class="sidebar-footer">
                <a href="/logout"><i class="fa-solid fa-right-from-bracket"></i> Sair</a>
            </div>
        `;
        sidebarContainer.innerHTML = sidebarHTML;

        // Adiciona a classe 'active' ao link da página atual para destacá-lo
        const currentPage = window.location.pathname.split('/').pop() || 'punir.html';
        const navId = `nav-${currentPage.split('.')[0]}`;
        const activeNavItem = document.getElementById(navId);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }

    // Lógica para ativar e desativar o menu mobile (em telas menores)
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
});
