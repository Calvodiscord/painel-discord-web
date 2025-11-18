const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Cria a mensagem com as opções para abrir tickets.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Central de Suporte')
            .setDescription('Selecione uma das opções abaixo para continuar:')
            .addFields(
                { name: '📩 Abrir Ticket', value: 'Crie um canal privado para conversar com a equipe sobre questões gerais.' },
                { name: '🤖 Ticket com IA', value: 'Receba uma resposta instantânea do nosso assistente de IA para perguntas comuns.' },
                { name: '🚨 Chamar Suporte', value: 'Crie um ticket e notifique a equipe imediatamente para problemas urgentes.' }
            );

        const normalButton = new ButtonBuilder().setCustomId('open-ticket-normal').setLabel('Abrir Ticket').setStyle(ButtonStyle.Secondary).setEmoji('📩');
        const aiButton = new ButtonBuilder().setCustomId('open-ticket-ai').setLabel('Ticket com IA').setStyle(ButtonStyle.Success).setEmoji('🤖');
        const staffButton = new ButtonBuilder().setCustomId('open-ticket-staff').setLabel('Chamar Suporte').setStyle(ButtonStyle.Danger).setEmoji('🚨');
        
        const row = new ActionRowBuilder().addComponents(normalButton, aiButton, staffButton);

        try {
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Painel de tickets avançado criado com sucesso!', ephemeral: true });
        } catch (error) {
            console.error("Erro ao criar painel de ticket:", error);
            await interaction.reply({ content: '❌ Falha ao criar o painel. Verifique as permissões do bot neste canal.', ephemeral: true });
        }
    },
};