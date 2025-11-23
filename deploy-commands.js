// painel-discord-web-main/deploy-commands.js

const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Carregue as configurações de um arquivo config.json
// CRIE ESTE ARQUIVO SE ELE NÃO EXISTIR!
const { clientId, guildId, token } = require('./config.json');

const commands = [
    // --- COMANDOS DE MODERAÇÃO ---
    new SlashCommandBuilder()
        .setName('punir')
        .setDescription('Aplica uma punição a um membro.')
        .addUserOption(option => 
            option.setName('membro')
                .setDescription('O membro que receberá a punição')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('O tipo de punição a ser aplicada')
                .setRequired(true)
                .addChoices(
                    { name: '⚠️ Aviso', value: 'aviso' },
                    { name: 'Silenciar (Timeout)', value: 'timeout' },
                    { name: 'Expulsar (Kick)', value: 'kick' },
                    { name: 'Banir (Ban)', value: 'ban' }
                ))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('O motivo da punição')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duracao')
                .setDescription('Duração em minutos (apenas para silenciar)')),

    new SlashCommandBuilder()
        .setName('limpar')
        .setDescription('Apaga um número de mensagens de um canal.')
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('O número de mensagens a serem apagadas (entre 1 e 100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),

    // --- COMANDOS DE INFORMAÇÃO ---
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Mostra informações detalhadas sobre o servidor.'),
    
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Mostra informações detalhadas sobre um membro.')
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('O membro que você quer ver as informações')
                .setRequired(false)), // Opcional, se não fornecer, mostra do próprio autor

    // --- COMANDOS DE UTILIDADE ---
    new SlashCommandBuilder()
        .setName('enquete')
        .setDescription('Cria uma enquete simples no canal.')
        .addStringOption(option =>
            option.setName('pergunta')
                .setDescription('A pergunta da enquete')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('sorteio')
        .setDescription('Inicia um sorteio interativo.')
        .addStringOption(option =>
            option.setName('duracao')
                .setDescription('Duração do sorteio (ex: 10m, 1h, 2d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('premio')
                .setDescription('O que será sorteado?')
                .setRequired(true)),

    // Adicione aqui o comando /setup_ticket se ele também for um comando de barra
    new SlashCommandBuilder()
        .setName('setup_ticket')
        .setDescription('Configura o painel de tickets em um canal.')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('O canal onde o painel de ticket será criado')
                .setRequired(true))

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`Iniciando o registro de ${commands.length} comandos (/) para o servidor.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Sucesso! ${data.length} comandos (/) foram registrados.`);
    } catch (error) {
        console.error(error);
    }
})();
