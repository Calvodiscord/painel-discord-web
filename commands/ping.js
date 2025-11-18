const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica a latência do bot e da API.'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        interaction.editReply(`Pong! 🏓\nLatência da Resposta: \`${latency}ms\`\nLatência da API do Discord: \`${apiLatency}ms\``);
    },
};
