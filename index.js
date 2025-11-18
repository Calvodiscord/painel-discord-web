const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const path = require('path');

// --- 1. CONFIGURAÇÃO DO SITE (EXPRESS) ---
const app = express();
const port = process.env.PORT || 3000;

// Middlewares para entender o corpo das requisições e servir arquivos estáticos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- 2. CONFIGURAÇÃO DO CLIENTE DISCORD ---
// As informações sensíveis virão das "Environment Variables" do Render
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// --- 3. ROTA DA API PARA PUNIR ---
app.post('/punir', async (req, res) => {
    try {
        const { username, punishment, duration, reason } = req.body;

        if (!username || !punishment || !reason) {
            return res.status(400).json({ message: 'Erro: Preencha todos os campos obrigatórios.' });
        }

        const guild = await client.guilds.fetch(process.env.guildId);
        const punishmentChannel = await guild.channels.fetch(process.env.punishment_channel_id);
        
        // Busca o membro pelo nome de usuário e tag
        const member = guild.members.cache.find(m => m.user.tag === username);

        if (!member) {
            return res.status(404).json({ message: `Erro: Usuário "${username}" não foi encontrado neste servidor.` });
        }

        // Cria a mensagem de log da punição
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Punição Aplicada via Painel Web')
            .addFields(
                { name: 'Usuário Punido', value: member.user.tag, inline: true },
                { name: 'Ação Tomada', value: punishment, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setFooter({ text: 'Ação executada pelo painel de controle.' })
            .setTimestamp();

        // Aplica a punição
        switch (punishment) {
            case 'timeout':
                const minutes = parseInt(duration);
                if (!minutes || minutes <= 0 || isNaN(minutes)) {
                    return res.status(400).json({ message: 'Erro: Duração inválida para silenciar.' });
                }
                await member.timeout(minutes * 60 * 1000, reason);
                embed.addFields({ name: 'Duração', value: `${minutes} minuto(s)`, inline: true });
                break;
            case 'kick':
                await member.kick(reason);
                break;
            case 'ban':
                await member.ban({ reason: reason });
                break;
        }

        // Envia o log no canal configurado e responde ao painel
        await punishmentChannel.send({ embeds: [embed] });
        res.status(200).json({ message: `Sucesso! ${username} foi punido com ${punishment}.` });

    } catch (error) {
        console.error('ERRO AO PROCESSAR PUNIÇÃO:', error);
        res.status(500).json({ message: 'Erro interno. Verifique se as permissões do bot e os IDs estão corretos.' });
    }
});

// --- 4. INICIALIZAÇÃO ---
// Faz o login do bot e, se bem-sucedido, inicia o site
client.login(process.env.token).then(() => {
    console.log(`[PAINEL WEB] Cliente conectado como ${client.user.tag}.`);
    app.listen(port, () => {
        console.log(`[PAINEL WEB] Servidor web iniciado na porta ${port}.`);
    });
}).catch(console.error);
