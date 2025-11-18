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
});```

#### **7. `public/js/punir.js` (Completo e Final)**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const memberSelect = document.getElementById('username');
    const form = document.querySelector('form');
    const responseDiv = document.getElementById('response');

    async function fetchAndPopulateMembers() {
        try {
            const response = await fetch('/api/members');
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Falha ao buscar membros.');
            }
            
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
                option.value = member.id;
                option.textContent = member.tag;
                memberSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Erro ao carregar membros:", error);
            memberSelect.innerHTML = `<option value="" disabled selected>${error.message}</option>`;
        }
    }
    
    fetchAndPopulateMembers();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        responseDiv.textContent = 'Processando punição...';
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
                const placeholder = memberSelect.querySelector('option[disabled]');
                if (placeholder) placeholder.selected = true;
            }
        } catch (error) {
            responseDiv.textContent = 'Erro de comunicação com o servidor.';
            responseDiv.classList.add('error');
        }
    });
});