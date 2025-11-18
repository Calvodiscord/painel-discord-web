document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    // Pega o caminho da página atual para saber qual link marcar como "ativo"
    const currentPage = window.location.pathname;

    // HTML da barra de navegação
    const navHTML = `
        <nav class="navbar">
            <a href="/punir.html" class="${currentPage.includes('punir') ? 'active' : ''}">Punições</a>
            <a href="/config.html" class="${currentPage.includes('config') ? 'active' : ''}">Configurações</a>
            <a href="/ticket.html" class="${currentPage.includes('ticket') ? 'active' : ''}">Tickets</a>
            <a href="/logout" class="logout">Sair</a>
        </nav>
    `;

    // Insere a barra de navegação no container
    navContainer.innerHTML = navHTML;
});