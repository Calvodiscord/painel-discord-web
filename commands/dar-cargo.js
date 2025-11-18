const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dar-cargo')
        .setDescription('Adiciona um cargo a um membro específico ou a todos.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(option =>
            option.setName('cargo')
                .setDescription('O cargo a ser adicionado.')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('O membro que receberá o cargo (deixe em branco para todos).')),
    async execute(interaction) {
        const cargo = interaction.options.getRole('cargo');
        const membro = interaction.options.getMember('membro');

        await interaction.deferReply({ ephemeral: true });

        if (membro) {
            // Dar cargo a um membro específico
            await membro.roles.add(cargo);
            await interaction.editReply(`✅ O cargo ${cargo.name} foi adicionado a ${membro.user.tag}.`);
        } else {
            // Dar cargo a todos os membros
            const membros = await interaction.guild.members.fetch();
            let count = 0;
            for (const [_, m] of membros) {
                if (!m.user.bot) {
                    await m.roles.add(cargo).catch(console.error);
                    count++;
                }
            }
            await interaction.editReply(`✅ O cargo ${cargo.name} foi adicionado a ${count} membros.`);
        }
    },
};
