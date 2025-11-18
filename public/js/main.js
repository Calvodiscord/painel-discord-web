document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    const currentPage = window.location.pathname;

    const navHTML = `
        <style>
            .navbar { display: flex; justify-content: center; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
            .navbar a { color: var(--text-muted); text-decoration: none; padding: 15px 20px; font-weight: 500; transition: color 0.2s, background-color 0.2s; }
            .navbar a:hover { color: var(--text-color); }
            .navbar a.active { color: var(--primary-color); border-bottom: 2px solid var(--primary-color); }
            .navbar a.logout { margin-left: auto; color: var(--error-color); }
            body { padding-top: 80px; }
        </style>
        <nav class="navbar">
            <a href="/punir.html" class="${currentPage.includes('punir') ? 'active' : ''}">Punições</a>
            <a href="/config.html" class="${currentPage.includes('config') ? 'active' : ''}">Configurações</a>
            <a href="/ticket.html" class="${currentPage.includes('ticket') ? 'active' : ''}">Tickets</a>
            <a href="/logout" class="logout">Sair</a>
        </nav>
    `;
    navContainer.innerHTML = navHTML;
});