document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settings-form');
    const ticketSetupForm = document.getElementById('ticket-setup-form');
    
    // Se os formulários não existem na página, não faz nada
    if (!settingsForm || !ticketSetupForm) return;

    const responseDiv = document.getElementById('response');
    const prefixInput = document.getElementById('prefix-input');
    const logChannelSelect = document.getElementById('channel-select');
    const panelChannelSelect = document.getElementById('ticket-channel-select');
    const categorySelect = document.getElementById('ticket-category-select');

    // Função para buscar dados e popular os selects
    async function initializeConfig() {
        try {
            const [settingsRes, textChannelsRes, categoriesRes] = await Promise.all([
                fetch('/api/settings'),
                fetch('/api/channels?type=text'),
                fetch('/api/channels?type=category')
            ]);
            
            if (!settingsRes.ok || !textChannelsRes.ok || !categoriesRes.ok) {
                throw new Error("Falha ao buscar dados do servidor. Verifique o login.");
            }
            
            const settings = await settingsRes.json();
            const textChannels = await textChannelsRes.json();
            const categories = await categoriesRes.json();

            const populateSelect = (select, options, selectedId, defaultText) => {
                select.innerHTML = `<option value="">${defaultText}</option>`;
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.id;
                    option.textContent = `#${opt.name}`;
                    if (opt.id === selectedId) option.selected = true;
                    select.appendChild(option);
                });
            };

            prefixInput.value = settings.prefix || '';
            populateSelect(logChannelSelect, textChannels, settings.punishmentChannelId, 'Selecione um canal de log');
            populateSelect(panelChannelSelect, textChannels, settings.ticketPanelChannelId, 'Selecione um canal para o painel');
            populateSelect(categorySelect, categories, settings.ticketCategoryId, 'Selecione uma categoria para os tickets');

        } catch (error) {
            console.error("Erro ao inicializar configurações:", error);
            responseDiv.textContent = error.message;
            responseDiv.className = 'response-box error visible';
        }
    }

    initializeConfig();

    // Evento para salvar as configurações gerais
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            prefix: prefixInput.value,
            punishmentChannelId: logChannelSelect.value
        };
        
        responseDiv.textContent = 'Salvando...';
        responseDiv.className = 'response-box visible';

        const response = await fetch('/api/settings/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        responseDiv.textContent = result.message;
        responseDiv.classList.add(response.ok ? 'success' : 'error');
    });
    
    // Evento para criar/atualizar o painel de ticket
    ticketSetupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            ticketPanelChannelId: panelChannelSelect.value,
            ticketCategoryId: categorySelect.value
        };
        
        responseDiv.textContent = 'Configurando painel...';
        responseDiv.className = 'response-box visible';

        await fetch('/api/settings/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const response = await fetch('/api/setup-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId: data.ticketPanelChannelId })
        });
        
        const result = await response.json();
        responseDiv.textContent = result.message;
        responseDiv.classList.add(response.ok ? 'success' : 'error');
    });
});