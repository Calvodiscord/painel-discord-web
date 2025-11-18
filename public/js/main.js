document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    const currentPage = window.location.pathname;

    const navHTML = `
        <nav class="navbar">
            <a href="/punir.html" class="${currentPage.includes('punir') ? 'active' : ''}">Punições</a>
            <a href="/config.html" class="${currentPage.includes('config') ? 'active' : ''}">Configurações</a>
            <a href="/ticket.html" class="${currentPage.includes('ticket') ? 'active' : ''}">Tickets</a>
            <a href="/logout" class="logout">Sair</a>
        </nav>
    `;
    navContainer.innerHTML = navHTML;
});