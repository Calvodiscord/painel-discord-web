const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const path = require('path');

// --- 1. CONFIGURAÇÃO DO SITE (EXPRESS) ---
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- 2. CONFIGURAÇÃO DO CLIENTE DISCORD ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', () => {
    console.log(`[BOT] Conectado como ${client.user.tag}.`);
    console.log(`[API] Endpoints de moderação prontos.`);
    client.user.setActivity('Painel de Moderação', { type: ActivityType.Watching });
});

// --- 3. ROTAS DA API ---

// NOVA ROTA: Fornece a lista de membros do servidor
app.get('/api/members', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(process.env.guildId);
        await guild.members.fetch(); // Garante que todos os membros estão em cache

        const memberList = guild.members.cache
            .filter(member => !member.user.bot) // Filtra para não incluir bots
            .map(member => ({
                id: member.id,
                tag: member.user.tag
            }))
            .sort((a, b) => a.tag.localeCompare(b.tag)); // Ordena alfabeticamente

        res.json(memberList);
    } catch (error) {
        console.error("Erro ao buscar membros:", error);
        res.status(500).json({ message: "Erro interno ao buscar a lista de membros." });
    }
});

// ROTA ATUALIZADA: Processa a punição com o novo campo de moderador
app.post('/api/punir', async (req, res) => {
    try {
        const { username, punishment, duration, reason, moderator } = req.body;

        if (!username || !punishment || !reason || !moderator) {
            return res.status(400).json({ message: 'Erro: Todos os campos são obrigatórios.' });
        }

        const guild = await client.guilds.fetch(process.env.guildId);
        const punishmentChannel = await guild.channels.fetch(process.env.punishment_channel_id);
        const member = guild.members.cache.find(m => m.user.tag === username);

        if (!member) {
            return res.status(404).json({ message: `Erro: Membro "${username}" não encontrado.` });
        }

        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('Ação de Moderação Registrada')
            .addFields(
                { name: 'Membro Punido', value: member.user.tag, inline: true },
                { name: 'Ação', value: punishment.charAt(0).toUpperCase() + punishment.slice(1), inline: true },
                { name: 'Aplicado por', value: moderator, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        if (punishment === 'timeout') {
            const minutes = parseInt(duration);
            if (!minutes || minutes <= 0 || isNaN(minutes)) {
                return res.status(400).json({ message: 'Erro: Duração inválida para silenciar.' });
            }
            await member.timeout(minutes * 60 * 1000, reason);
            embed.addFields({ name: 'Duração', value: `${minutes} minuto(s)`, inline: false });
        } else if (punishment === 'kick') {
            await member.kick(reason);
        } else if (punishment === 'ban') {
            await member.ban({ reason: reason });
        }

        await punishmentChannel.send({ embeds: [embed] });
        res.status(200).json({ message: `Sucesso! ${username} foi punido.` });

    } catch (error) {
        console.error('ERRO AO PROCESSAR PUNIÇÃO:', error);
        res.status(500).json({ message: 'Erro interno. Verifique as permissões do bot e os IDs.' });
    }
});


// --- 4. INICIALIZAÇÃO ---
client.login(process.env.token).then(() => {
    app.listen(port, () => {
        console.log(`[WEB] Servidor iniciado em http://localhost:${port}`);
    });
}).catch(err => {
    console.error("[ERRO CRÍTICO] Falha ao fazer login:", err.message);
    process.exit(1);
});```
          
