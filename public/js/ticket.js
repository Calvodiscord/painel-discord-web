document.addEventListener('DOMContentLoaded', () => {
    const ticketListDiv = document.getElementById('ticket-list');

    async function fetchAndDisplayTickets() {
        try {
            ticketListDiv.innerHTML = '<p>Carregando tickets abertos...</p>';
            const response = await fetch('/api/tickets');
            if (!response.ok) throw new Error('Falha ao buscar tickets.');
            
            const tickets = await response.json();

            if (tickets.length === 0) {
                ticketListDiv.innerHTML = '<p>Nenhum ticket aberto no momento.</p>';
                return;
            }

            ticketListDiv.innerHTML = ''; // Limpa o "carregando"
            tickets.forEach(ticket => {
                const ticketElement = document.createElement('div');
                ticketElement.className = 'ticket-item';
                ticketElement.innerHTML = `
                    <span class="ticket-name">#${ticket.name}</span>
                    <button class="close-button" data-channel-id="${ticket.id}">Fechar Ticket</button>
                `;
                ticketListDiv.appendChild(ticketElement);
            });

        } catch (error) {
            console.error('Erro:', error);
            ticketListDiv.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
    }

    // Adiciona o event listener para os botões de fechar
    ticketListDiv.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('close-button')) {
            const channelId = e.target.dataset.channelId;
            e.target.textContent = 'Fechando...';
            e.target.disabled = true;

            try {
                const response = await fetch('/api/tickets/close', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channelId })
                });

                if (response.ok) {
                    // Remove o item da lista visualmente
                    e.target.closest('.ticket-item').remove();
                } else {
                    alert('Falha ao fechar o ticket. Tente novamente.');
                    e.target.textContent = 'Fechar Ticket';
                    e.target.disabled = false;
                }
            } catch (error) {
                console.error("Erro ao fechar ticket:", error);
            }
        }
    });

    fetchAndDisplayTickets();
});
