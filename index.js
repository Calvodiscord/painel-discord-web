const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActivityType, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const fs = require('node:fs');
const { generateAiResponse } = require('./ai-helper.js');

// --- 1. CONFIGURAÇÕES E INICIALIZAÇÃO ---
const app = express();
const port = process.env.PORT || 3000;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
const settingsPath = path.join(__dirname, 'settings.json');
const usersPath = path.join(__dirname, 'users.json');

// Carregador de Comandos de Barra
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

// --- FUNÇÕES DE AJUDA ---
function readSettings() {
    try {
        if (fs.existsSync(settingsPath)) { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
    } catch (error) { console.error("Erro ao ler settings.json:", error); }
    return { punishmentChannelId: process.env.punishment_channel_id };
}
function writeSettings(data) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) { console.error("Erro ao salvar settings.json:", error); }
}

// --- 2. MIDDLEWARES DO EXPRESS ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    store: new FileStore({ path: './sessions', logFn: function() {} }),
    secret: process.env.SESSION_SECRET || 'um-segredo-muito-forte-e-aleatorio',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: 'auto',
        maxAge: 1000 * 60 * 60 * 24 // Duração da sessão: 1 dia
    }
}));
const checkAuth = (req, res, next) => {
    if (req.session.loggedin) {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Não autorizado. Faça o login novamente.' });
    }
    res.redirect('/index.html');
};

// --- 3. ROTAS DO SITE ---
app.get('/', (req, res) => res.redirect('/index.html'));
app.post('/login', (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const user = users.find(u => u.username === req.body.username && u.password === req.body.password);
        if (user) {
            req.session.loggedin = true;
            req.session.username = user.username;
            res.status(200).json({ message: 'Login bem-sucedido!' });
        } else {
            res.status(401).json({ message: 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error('Erro ao ler users.json:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/index.html'));
});

// Protege o acesso direto às páginas do painel
app.use('/comandos.html', checkAuth);
app.use('/punir.html', checkAuth);
app.use('/config.html', checkAuth);
app.use('/ticket.html', checkAuth);

// --- 4. ROTAS DA API ---
app.get('/api/commands', checkAuth, (req, res) => {
    try {
        const commandList = client.commands.map(cmd => ({
            name: cmd.data.name,
            description: cmd.data.description
        })).sort((a, b) => a.name.localeCompare(b.name));
        res.json(commandList);
    } catch (error) {
        console.error("Erro ao buscar lista de comandos:", error);
        res.status(500).json({ message: "Erro ao buscar comandos." });
    }
});

app.get('/api/members', checkAuth, async (req, res) => {
    try {
        const guild = await client.guilds.fetch(process.env.guildId);
        const memberList = guild.members.cache.filter(m => !m.user.bot).map(m => ({ id: m.id, tag: m.user.tag })).sort((a, b) => a.tag.localeCompare(b.tag));
        res.json(memberList);
    } catch (error) {
        console.error("Erro ao buscar membros:", error);
        res.status(500).json({ message: "Erro ao ler lista de membros." });
    }
});

app.post('/api/punir', checkAuth, async (req, res) => {
    try {
        const settings = readSettings();
        const { userId, punishment, duration, reason, evidence } = req.body;
        const moderator = req.session.username;
        if (!userId || !punishment || !reason) return res.status(400).json({ message: 'Campos obrigatórios faltando.' });

        const guild = await client.guilds.fetch(process.env.guildId);
        const member = await guild.members.fetch(userId);
        const punishmentChannel = guild.channels.cache.get(settings.punishmentChannelId);

        if (!member) return res.status(404).json({ message: 'Membro não encontrado.' });
        if (!punishmentChannel) return res.status(404).json({ message: 'Canal de log não configurado.' });
        
        const embed = new EmbedBuilder()
            .addFields(
                { name: '👤 Membro', value: member.user.tag, inline: true },
                { name: '👮‍♂️ Aplicado por', value: moderator, inline: true },
                { name: '⚖️ Ação', value: punishment.charAt(0).toUpperCase() + punishment.slice(1), inline: true },
                { name: '📜 Motivo', value: reason }
            ).setTimestamp();
        
        if (evidence) embed.addFields({ name: '📸 Evidência', value: `[Clique para ver](${evidence})` });

        switch (punishment) {
            case 'aviso':
                embed.setColor('#FEE75C');
                embed.setTitle('⚠️ Advertência Registrada');
                break;
            case 'timeout':
                embed.setColor('#E67E22');
                embed.setTitle('⏳ Membro Silenciado');
                const minutes = parseInt(duration);
                if (!minutes || minutes <= 0 || isNaN(minutes)) return res.status(400).json({ message: 'Duração inválida para silenciar.' });
                await member.timeout(minutes * 60 * 1000, reason);
                embed.addFields({ name: 'Duração', value: `${minutes} minuto(s)` });
                break;
            case 'kick':
                embed.setColor('#E74C3C');
                embed.setTitle('👢 Membro Expulso');
                await member.kick(reason);
                break;
            case 'ban':
                embed.setColor('#992D22');
                embed.setTitle('🚫 Membro Banido');
                await member.ban({ reason: reason });
                break;
            default:
                return res.status(400).json({ message: 'Tipo de punição inválida.' });
        }

        await punishmentChannel.send({ embeds: [embed] });
        res.status(200).json({ message: `Sucesso! A ação de '${punishment}' foi registrada para ${member.user.tag}.` });

    } catch (error) {
        console.error('ERRO AO PUNIR:', error);
        res.status(500).json({ message: 'Erro interno. Verifique as permissões do bot.' });
    }
});

app.get('/api/channels', checkAuth, async (req, res) => {
    try {
        const { type } = req.query;
        const guild = await client.guilds.fetch(process.env.guildId);
        const channelTypeFilter = type === 'category' ? ChannelType.GuildCategory : ChannelType.GuildText;
        const channels = guild.channels.cache.filter(ch => ch.type === channelTypeFilter).map(ch => ({ id: ch.id, name: ch.name })).sort((a, b) => a.name.localeCompare(b.name));
        res.json(channels);
    } catch (error) {
        console.error('Erro ao buscar canais:', error);
        res.status(500).json({ message: 'Erro ao buscar canais.' });
    }
});

app.get('/api/settings', checkAuth, (req, res) => res.json(readSettings()));
app.post('/api/settings/save', checkAuth, (req, res) => {
    try {
        writeSettings({ ...readSettings(), ...req.body });
        res.status(200).json({ message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar:', error);
        res.status(500).json({ message: 'Falha ao salvar configurações.' });
    }
});

app.post('/api/setup-ticket', checkAuth, async (req, res) => {
    try {
        const { channelId } = req.body;
        const guild = await client.guilds.fetch(process.env.guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ message: 'Canal não encontrado.' });
        
        const embed = new EmbedBuilder().setColor('#5865F2').setTitle('🎫 Central de Suporte').setDescription('Selecione uma opção:').addFields(
            { name: '📩 Abrir Ticket', value: 'Converse com a equipe.' },
            { name: '🤖 Ticket com IA', value: 'Receba uma resposta instantânea.' },
            { name: '🚨 Chamar Suporte', value: 'Notifique a equipe para urgências.' }
        );
        const normalButton = new ButtonBuilder().setCustomId('open-ticket-normal').setLabel('Abrir Ticket').setStyle(ButtonStyle.Secondary).setEmoji('📩');
        const aiButton = new ButtonBuilder().setCustomId('open-ticket-ai').setLabel('Ticket com IA').setStyle(ButtonStyle.Success).setEmoji('🤖');
        const staffButton = new ButtonBuilder().setCustomId('open-ticket-staff').setLabel('Chamar Suporte').setStyle(ButtonStyle.Danger).setEmoji('🚨');
        const row = new ActionRowBuilder().addComponents(normalButton, aiButton, staffButton);

        await channel.send({ embeds: [embed], components: [row] });
        res.status(200).json({ message: 'Painel de ticket avançado criado!' });
    } catch (error) {
        console.error('Erro ao criar painel:', error);
        res.status(500).json({ message: 'Falha ao criar painel.' });
    }
});

app.get('/api/tickets', checkAuth, async (req, res) => {
    const guild = await client.guilds.fetch(process.env.guildId);
    const tickets = guild.channels.cache.filter(ch => ch.name.startsWith('ticket-')).map(ch => ({ id: ch.id, name: ch.name }));
    res.json(tickets);
});

app.post('/api/tickets/close', checkAuth, async (req, res) => {
    try {
        const { channelId } = req.body;
        const guild = await client.guilds.fetch(process.env.guildId);
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            await channel.delete(`Ticket fechado por ${req.session.username} via painel.`);
            res.status(200).json({ message: 'Ticket fechado com sucesso.' });
        } else {
            res.status(404).json({ message: 'Canal do ticket não encontrado.' });
        }
    } catch (error) {
        console.error("Erro ao fechar ticket via API:", error);
        res.status(500).json({ message: 'Falha ao fechar o ticket.' });
    }
});

app.get('/api/tickets/:channelId/messages', checkAuth, async (req, res) => {
    try {
        const guild = await client.guilds.fetch(process.env.guildId);
        const channel = guild.channels.cache.get(req.params.channelId);
        if (!channel) return res.status(404).json({ message: 'Ticket não encontrado.' });
        
        const messages = await channel.messages.fetch({ limit: 50 });
        const history = messages.map(m => ({ author: m.author.tag, content: m.content })).reverse();
        res.json(history);
    } catch(error) {
        res.status(500).json({ message: "Erro ao buscar mensagens." });
    }
});

app.post('/api/tickets/reply', checkAuth, async (req, res) => {
    try {
        const { channelId, content } = req.body;
        const guild = await client.guilds.fetch(process.env.guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ message: 'Ticket não encontrado.' });
        
        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setAuthor({ name: `Resposta da Equipe (${req.session.username})`, iconURL: client.user.displayAvatarURL() })
            .setDescription(content);
        
        await channel.send({ embeds: [embed] });
        res.status(200).json({ message: 'Resposta enviada.' });
    } catch (error) {
        res.status(500).json({ message: "Falha ao enviar resposta." });
    }
});

app.post('/api/tickets/ai-reply', checkAuth, async (req, res) => {
    try {
        const { channelId } = req.body;
        const guild = await client.guilds.fetch(process.env.guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ message: 'Ticket não encontrado.' });
        
        const messages = await channel.messages.fetch({ limit: 15 });
        const history = messages.map(m => `${m.author.tag}: ${m.content}`).reverse().join('\n');
        
        const aiReply = await generateAiResponse(history);
        res.status(200).json({ reply: aiReply });
    } catch (error) {
        console.error("Erro na API de sugestão de IA:", error);
        res.status(500).json({ message: 'Falha ao gerar resposta.' });
    }
});


// --- 5. EVENTOS DO BOT ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.channel.name.startsWith('ticket-ai-')) return;
    const messages = await message.channel.messages.fetch({ limit: 2 });
    if (messages.size > 1) return;
    try {
        await message.channel.sendTyping();
        const aiResponse = await generateAiResponse(message.content);
        const responseEmbed = new EmbedBuilder().setColor("#2ECC71").setAuthor({ name: "Assistente de IA 🤖" }).setDescription(aiResponse).setFooter({ text: "Se isso não resolver, um membro da equipe irá ajudá-lo." });
        await message.channel.send({ embeds: [responseEmbed] });
    } catch (error) {
        console.error("Erro na resposta interativa da IA:", error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try { await command.execute(interaction); } 
        catch (error) { console.error(error); await interaction.reply({ content: 'Ocorreu um erro!', ephemeral: true }); }
    }
    if (interaction.isButton()) {
        const { customId } = interaction;
        const settings = readSettings();

        if (customId === 'close-ticket-discord') {
            await interaction.reply({ content: '🔒 Fechando este ticket em 5 segundos...', ephemeral: true });
            setTimeout(() => interaction.channel.delete('Ticket fechado.').catch(console.error), 5000);
            return;
        }

        if (customId.startsWith('open-ticket')) {
            await interaction.deferReply({ ephemeral: true });
            try {
                const category = settings.ticketCategoryId;
                const existingChannel = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id);
                if (existingChannel) {
                    return interaction.editReply(`⚠️ Você já possui um ticket aberto em ${existingChannel}.`);
                }
                if (!category || !interaction.guild.channels.cache.get(category)) {
                    return interaction.editReply('❌ A categoria para tickets não foi configurada. Contate um administrador.');
                }
                
                const isAiTicket = customId === 'open-ticket-ai';
                const channelName = `${isAiTicket ? 'ticket-ai' : 'ticket'}-${interaction.user.username.substring(0, 20)}`;
                const ticketChannel = await interaction.guild.channels.create({
                    name: channelName, type: ChannelType.GuildText, parent: category, topic: interaction.user.id,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: process.env.STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
                    ],
                });
                await interaction.editReply(`✅ Seu ticket foi criado com sucesso em ${ticketChannel}`);
                
                const closeButton = new ButtonBuilder().setCustomId('close-ticket-discord').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒');
                const row = new ActionRowBuilder().addComponents(closeButton);
                const baseEmbed = new EmbedBuilder().setColor('#5865F2').setDescription(`Olá ${interaction.user}, bem-vindo ao seu ticket!`);

                switch (customId) {
                    case 'open-ticket-normal':
                        await ticketChannel.send({ embeds: [baseEmbed.addFields({ name: 'Próximo Passo', value: 'Um membro da equipe estará com você em breve.'})], components: [row] });
                        break;
                    case 'open-ticket-ai':
                        await ticketChannel.send({ embeds: [new EmbedBuilder().setColor("#2ECC71").setAuthor({ name: "Assistente de IA 🤖" }).setDescription(`Olá ${interaction.user}! Sou um assistente de IA. Por favor, descreva seu problema em detalhes para que eu possa tentar ajudar.`)], components: [row] });
                        break;
                    case 'open-ticket-staff':
                        const staffPing = process.env.STAFF_ROLE_ID ? `<@&${process.env.STAFF_ROLE_ID}>` : 'A equipe de suporte';
                        await ticketChannel.send({
                            content: `${staffPing}, ${interaction.user} solicitou suporte urgente!`,
                            embeds: [baseEmbed.setColor('#E74C3C').addFields({ name: 'Atenção Urgente', value: 'A equipe foi notificada e estará com você o mais rápido possível.' })],
                            components: [row]
                        });
                        break;
                }
            } catch (error) {
                console.error("Erro ao processar botão de ticket:", error);
                await interaction.editReply({ content: '❌ Ocorreu um erro ao criar seu ticket.' });
            }
        }
    }
});

// --- 6. INICIALIZAÇÃO E CACHE ---
client.once('ready', async () => {
    console.log(`[BOT] Conectado como ${client.user.tag}.`);
    client.user.setActivity('Painel de Moderação', { type: ActivityType.Watching });
    try {
        console.log('[CACHE] Iniciando o cache de membros do servidor...');
        const guild = await client.guilds.fetch(process.env.guildId);
        await guild.members.fetch({ force: true });
        console.log(`[CACHE] Sucesso! ${guild.members.cache.size} membros carregados.`);
    } catch (error) {
        console.error('[CACHE] Falha ao carregar membros:', error.message);
    }
});

client.login(process.env.token).then(() => {
    app.listen(port, () => {
        console.log(`[WEB] Servidor iniciado na porta ${port}.`);
    });
}).catch(err => {
    console.error("[ERRO CRÍTICO] Falha ao fazer login:", err.message);
    process.exit(1);
});