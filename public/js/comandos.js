document.addEventListener('DOMContentLoaded', () => {
    const commandListDiv = document.getElementById('command-list');
    if (!commandListDiv) return; // Garante que só rode na página de comandos

    async function fetchAndDisplayCommands() {
        try {
            const response = await fetch('/api/commands');
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Falha ao buscar comandos.');
            }
            
            const commands = await response.json();
            
            if (commands.length === 0) {
                commandListDiv.innerHTML = '<p>Nenhum comando de barra foi registrado ou encontrado.</p>';
                return;
            }

            commandListDiv.innerHTML = ''; // Limpa a mensagem "Carregando..."
            
            commands.forEach(command => {
                const commandElement = document.createElement('div');
                commandElement.className = 'command-item';
                commandElement.innerHTML = `
                    <div class="command-name">/${command.name}</div>
                    <div class="command-description">${command.description}</div>
                `;
                commandListDiv.appendChild(commandElement);
            });

        } catch (error) {
            console.error('Erro ao listar comandos:', error);
            commandListDiv.innerHTML = `<p style="color: var(--error-color);">${error.message}</p>`;
        }
    }
    
    fetchAndDisplayCommands();
});