document.addEventListener('DOMContentLoaded', () => {
    const memberSelect = document.getElementById('username');
    const form = document.querySelector('form');
    const responseDiv = document.getElementById('response');

    async function fetchAndPopulateMembers() {
        try {
            const response = await fetch('/api/members');
            if (!response.ok) {
                throw new Error('Falha ao buscar membros. Verifique as permissões do bot.');
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
            console.error("Erro:", error);
            memberSelect.innerHTML = `<option value="" disabled selected>${error.message}</option>`;
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
                const placeholder = memberSelect.querySelector('option[disabled]');
                placeholder.selected = true;
            }
        } catch (error) {
            responseDiv.textContent = 'Erro de comunicação com o servidor.';
            responseDiv.classList.add('error');
        }
    });
});