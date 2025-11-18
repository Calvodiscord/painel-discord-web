const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActivityType, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('node:fs');

// --- 1. CONFIGURAÇÕES E INICIALIZAÇÃO ---
const app = express();
const port = process.env.PORT || 3000;
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});
const settingsPath = path.join(__dirname, 'settings.json');
const usersPath = path.join(__dirname, 'users.json');

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// --- FUNÇÕES DE AJUDA PARA LER/SALVAR CONFIGURAÇÕES ---
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
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto' }
}));
const checkAuth = (req, res, next) => {
    if (req.session.loggedin) { next(); } else { res.redirect('/login.html'); }
};

// --- 3. ROTAS DO SITE ---
app.get('/', (req, res) => res.redirect('/login.html'));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    try {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            req.session.loggedin = true;
            req.session.username = user.username;
            res.status(200).json({ message: 'Login bem-sucedido!' });
        } else {
            res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro ao ler users.json:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login.html'));
});
app.use('/punir.html', checkAuth);
app.use('/config.html', checkAuth);
app.use('/ticket.html', checkAuth);

// --- 4. ROTAS DA API ---
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
        const punishmentChannel = await guild.channels.fetch(settings.punishmentChannelId);

        if (!member) return res.status(404).json({ message: 'Membro não encontrado.' });
        if (!punishmentChannel) return res.status(404).json({ message: 'Canal de log não configurado.' });
        
        const embed = new EmbedBuilder().setColor('#E74C3C').setTitle('⚖️ Ação de Moderação Registrada').addFields(
            { name: '👤 Membro Punido', value: member.user.tag, inline: true },
            { name: '👮‍♂️ Aplicado por', value: moderator, inline: true },
            { name: '⚖️ Ação', value: punishment.charAt(0).toUpperCase() + punishment.slice(1), inline: true },
            { name: '📜 Motivo', value: reason }
        ).setTimestamp();
        
        if (evidence) embed.addFields({ name: '📸 Evidência', value: `[Clique para ver](${evidence})` });

        if (punishment === 'timeout') {
            const minutes = parseInt(duration);
            if (!minutes || minutes <= 0 || isNaN(minutes)) return res.status(400).json({ message: 'Duração inválida.' });
            await member.timeout(minutes * 60 * 1000, reason);
            embed.addFields({ name: '⏳ Duração', value: `${minutes} minuto(s)` });
        } else if (punishment === 'kick') { await member.kick(reason); } 
        else if (punishment === 'ban') { await member.ban({ reason: reason }); }

        await punishmentChannel.send({ embeds: [embed] });
        res.status(200).json({ message: `Sucesso! ${member.user.tag} foi punido.` });
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
        
        const embed = new EmbedBuilder().setColor('#5865F2').setTitle('🎫 Suporte ao Servidor').setDescription('Clique no botão abaixo para abrir um ticket.');
        const button = new ButtonBuilder().setCustomId('open-ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩');
        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });
        res.status(200).json({ message: 'Painel de ticket criado com sucesso!' });
    } catch (error) {
        console.error('Erro ao criar painel de ticket:', error);
        res.status(500).json({ message: 'Falha ao criar painel.' });
    }
});

app.get('/api/tickets', checkAuth, async (req, res) => {
    const guild = await client.guilds.fetch(process.env.guildId);
    const tickets = guild.channels.cache.filter(ch => ch.name.startsWith('ticket-')).map(ch => ({ id: ch.id, name: ch.name }));
    res.json(tickets);
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
            .setAuthor({ name: `Resposta da Equipe (${req.session.username})` })
            .setDescription(content);
        
        await channel.send({ embeds: [embed] });
        res.status(200).json({ message: 'Resposta enviada.' });
    } catch (error) {
        res.status(500).json({ message: "Falha ao enviar resposta." });
    }
});

// --- 5. EVENTOS DO BOT ---
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try { await command.execute(interaction); } 
        catch (error) { console.error(error); await interaction.reply({ content: 'Ocorreu um erro!', ephemeral: true }); }
    }
    if (interaction.isButton()) {
        if (interaction.customId === 'open-ticket') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const settings = readSettings();
                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username.substring(0, 20)}`,
                    type: ChannelType.GuildText,
                    parent: settings.ticketCategoryId,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        // { id: 'SEU_CARGO_DE_MOD_ID', allow: [PermissionsBitField.Flags.ViewChannel] }
                    ],
                });
                const welcomeEmbed = new EmbedBuilder().setColor('#5865F2').setDescription(`Olá ${interaction.user}, bem-vindo ao seu ticket! Por favor, descreva seu problema em detalhes.`);
                await ticketChannel.send({ embeds: [welcomeEmbed] });
                await interaction.editReply({ content: `✅ Seu ticket foi criado com sucesso em ${ticketChannel}` });
            } catch (error) {
                console.error("Erro ao criar ticket:", error);
                await interaction.editReply({ content: '❌ Não foi possível criar seu ticket. Verifique as configurações no painel.' });
            }
        }
    }
});

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

// --- 6. INICIALIZAÇÃO ---
client.login(process.env.token).then(() => {
    app.listen(port, () => {
        console.log(`[WEB] Servidor iniciado na porta ${port}.`);
    });
}).catch(err => {
    console.error("[ERRO CRÍTICO] Falha ao fazer login:", err.message);
    process.exit(1);
});