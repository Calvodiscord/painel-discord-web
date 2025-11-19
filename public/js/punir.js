document.addEventListener('DOMContentLoaded', () => {
    const memberSelect = document.getElementById('username');
    const form = document.querySelector('form');
    const responseDiv = document.getElementById('response');

    if (!form) return; // Garante que o script só rode na página correta

    // Função para buscar e popular a lista de membros do servidor
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

    // Evento que dispara quando o formulário de punição é enviado
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