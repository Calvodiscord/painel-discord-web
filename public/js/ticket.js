// Este arquivo está vazio por enquanto para simplificar o diagnóstico.
// Adicionaremos a lógica do modal depois que o carregamento for resolvido.
document.addEventListener('DOMContentLoaded', () => {
    const ticketListDiv = document.getElementById('ticket-list');
    
    async function fetchAndDisplayTickets() {
        try {
            ticketListDiv.innerHTML = '<p>Carregando tickets abertos...</p>';
            const response = await fetch('/api/tickets');
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Falha ao buscar tickets.');
            }
            
            const tickets = await response.json();

            if (tickets.length === 0) {
                ticketListDiv.innerHTML = '<p>Nenhum ticket aberto no momento.</p>';
                return;
            }

            ticketListDiv.innerHTML = '';
            tickets.forEach(ticket => {
                const ticketElement = document.createElement('div');
                ticketElement.className = 'ticket-item';
                ticketElement.innerHTML = `<span class="ticket-name">#${ticket.name}</span>`;
                ticketListDiv.appendChild(ticketElement);
            });
        } catch (error) {
            console.error('Erro ao listar tickets:', error);
            ticketListDiv.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
    }
    
    fetchAndDisplayTickets();
});