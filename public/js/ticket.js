document.addEventListener('DOMContentLoaded', () => {
    const ticketListDiv = document.getElementById('ticket-list');
    const modal = document.getElementById('ticket-modal');
    if (!modal) return; // Sai se o modal não existir na página (ex: em outras páginas)

    const modalChannelName = document.getElementById('modal-channel-name');
    const chatHistory = document.getElementById('chat-history');
    const replyForm = document.getElementById('reply-form');
    const replyInput = document.getElementById('reply-input');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const aiReplyBtn = document.getElementById('ai-reply-btn');
    const addLinkBtn = document.getElementById('add-link-btn');
    
    let activeChannelId = null;
    let pollingInterval = null;

    // Função para buscar e exibir mensagens de um ticket
    async function fetchMessages(channelId) {
        try {
            const response = await fetch(`/api/tickets/${channelId}/messages`);
            const messages = await response.json();
            chatHistory.innerHTML = '';
            messages.forEach(msg => {
                const msgElement = document.createElement('div');
                msgElement.className = 'chat-message';
                msgElement.innerHTML = `<div class="author">${msg.author}</div><div class="content">${msg.content}</div>`;
                chatHistory.appendChild(msgElement);
            });
            chatHistory.scrollTop = chatHistory.scrollHeight;
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            chatHistory.innerHTML = `<p class="error-text">Não foi possível carregar as mensagens.</p>`;
        }
    }

    // Abre o modal de chat
    async function openModal(channelId, channelName) {
        activeChannelId = channelId;
        modalChannelName.textContent = `#${channelName}`;
        modal.classList.add('visible');
        chatHistory.innerHTML = '<p>Carregando histórico de mensagens...</p>';
        await fetchMessages(channelId);
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => fetchMessages(channelId), 7000); // Verifica por novas mensagens a cada 7 segundos
    }

    // Fecha o modal de chat
    function closeModal() {
        modal.classList.remove('visible');
        activeChannelId = null;
        if (pollingInterval) clearInterval(pollingInterval);
    }
    
    // Função para buscar e exibir a lista de tickets abertos
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
                ticketElement.dataset.channelId = ticket.id;
                ticketElement.dataset.channelName = ticket.name;
                ticketElement.innerHTML = `<span class="ticket-name">#${ticket.name}</span>`;
                ticketListDiv.appendChild(ticketElement);
            });
        } catch (error) {
            console.error('Erro ao listar tickets:', error);
            ticketListDiv.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
    }
    
    // Adiciona o event listener na lista para abrir o modal
    ticketListDiv.addEventListener('click', (e) => {
        const ticketItem = e.target.closest('.ticket-item');
        if (ticketItem) {
            const { channelId, channelName } = ticketItem.dataset;
            openModal(channelId, channelName);
        }
    });

    // Enviar resposta pelo formulário do modal
    replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = replyInput.value.trim();
        if (!content || !activeChannelId) return;
        replyInput.disabled = true;
        try {
            await fetch('/api/tickets/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: activeChannelId, content })
            });
            replyInput.value = '';
            await fetchMessages(activeChannelId);
        } catch (error) {
            console.error("Erro ao enviar resposta:", error);
        } finally {
            replyInput.disabled = false;
            replyInput.focus();
        }
    });

    // Adicionar Link
    addLinkBtn.addEventListener('click', () => {
        const url = prompt("Digite a URL completa do link (ex: https://google.com):");
        if (!url || !url.startsWith('http')) {
            if(url) alert("URL inválida. Por favor, inclua http:// ou https://");
            return;
        }
        const selectionStart = replyInput.selectionStart;
        const selectionEnd = replyInput.selectionEnd;
        const linkText = replyInput.value.substring(selectionStart, selectionEnd) || "Clique aqui";
        const markdownLink = `[${linkText}](${url})`;
        const textBefore = replyInput.value.substring(0, selectionStart);
        const textAfter  = replyInput.value.substring(selectionEnd, replyInput.value.length);
        replyInput.value = textBefore + markdownLink + textAfter;
        replyInput.focus();
    });

    // Responder com IA
    aiReplyBtn.addEventListener('click', async () => {
        if (!activeChannelId) return;
        aiReplyBtn.textContent = '🤖 Pensando...';
        aiReplyBtn.disabled = true;
        try {
            const response = await fetch('/api/tickets/ai-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: activeChannelId })
            });
            const result = await response.json();
            replyInput.value = result.reply;
            replyInput.focus();
        } catch (error) {
            console.error("Erro na sugestão de IA:", error);
            replyInput.value = "Houve um erro ao contatar a IA.";
        } finally {
            aiReplyBtn.textContent = '🤖 Responder com IA';
            aiReplyBtn.disabled = false;
        }
    });

    // Event listeners para fechar o modal
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Inicia a busca inicial de tickets
    fetchAndDisplayTickets();
});