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
```---

#### **Arquivo 2: `public/js/punir.js` (NOVO)**
*(A lógica da página de punição, agora em seu próprio arquivo)*
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const memberSelect = document.getElementById('username');
    const form = document.querySelector('form');
    const responseDiv = document.getElementById('response');

    async function fetchAndPopulateMembers() {
        try {
            const response = await fetch('/api/members');
            if (!response.ok) throw new Error('Falha ao buscar membros.');
            
            const members = await response.json();
            
            memberSelect.innerHTML = '';
            
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Selecione um membro da lista";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            memberSelect.appendChild(defaultOption);

            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id; // Agora usamos o ID do usuário, que é mais seguro
                option.textContent = member.tag;
                memberSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Erro:", error);
            memberSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar membros</option>';
        }
    }
    
    fetchAndPopulateMembers();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        responseDiv.textContent = 'Processando...';
        responseDiv.className = 'response-box visible';

        try {
            const response = await fetch('/api/punir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            responseDiv.textContent = result.message;
            responseDiv.classList.add(response.ok ? 'success' : 'error');
            if (response.ok) {
                form.reset();
                // Recarrega a lista de membros após a punição
                const placeholder = memberSelect.querySelector('option[disabled]');
                placeholder.selected = true;
            }
        } catch (error) {
            responseDiv.textContent = 'Erro de comunicação com o servidor.';
            responseDiv.classList.add('error');
        }
    });
});
