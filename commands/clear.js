const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Apaga uma quantidade de mensagens de um canal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('O número de mensagens para apagar (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    async execute(interaction) {
        const quantidade = interaction.options.getInteger('quantidade');

        await interaction.channel.bulkDelete(quantidade, true);
        await interaction.reply({ content: `✅ Sucesso! ${quantidade} mensagens foram apagadas.`, ephemeral: true });
    },
};
