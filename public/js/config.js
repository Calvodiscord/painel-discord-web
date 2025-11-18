document.addEventListener('DOMContentLoaded', () => {
    const channelSelect = document.getElementById('channel-select');
    const form = document.querySelector('form');
    const responseDiv = document.getElementById('response');

    let currentSettings = {};

    // Função para buscar canais e configurações atuais
    async function initializeConfig() {
        try {
            // Busca as configurações atuais primeiro
            const settingsRes = await fetch('/api/settings');
            currentSettings = await settingsRes.json();

            // Busca a lista de canais de texto
            const channelsRes = await fetch('/api/channels');
            const channels = await channelsRes.json();

            channelSelect.innerHTML = ''; // Limpa o "carregando"

            if (channels.length === 0) {
                channelSelect.innerHTML = '<option value="">Nenhum canal de texto encontrado</option>';
                return;
            }

            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = `#${channel.name}`;
                // Seleciona o canal que está salvo atualmente
                if (channel.id === currentSettings.punishmentChannelId) {
                    option.selected = true;
                }
                channelSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Erro ao inicializar configurações:", error);
            responseDiv.textContent = 'Falha ao carregar dados do servidor.';
            responseDiv.className = 'response-box error visible';
        }
    }

    initializeConfig();

    // Evento para salvar as configurações
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedChannelId = channelSelect.value;
        
        responseDiv.textContent = 'Salvando...';
        responseDiv.className = 'response-box visible';

        try {
            const response = await fetch('/api/settings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ punishmentChannelId: selectedChannelId })
            });

            const result = await response.json();
            responseDiv.textContent = result.message;
            responseDiv.classList.add(response.ok ? 'success' : 'error');

        } catch (error) {
            responseDiv.textContent = 'Erro de comunicação ao salvar.';
            responseDiv.classList.add('error');
        }
    });
});