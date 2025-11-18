const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActivityType, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('node:fs');
const { generateAiResponse } = require('./ai-helper.js'); // Importa nossa IA

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
    } catch (error) { res.status(500).json({ message: 'Erro interno.' }); }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login.html'));
});
app.use('/punir.html', checkAuth);
app.use('/config.html', checkAuth);
app.use('/ticket.html', checkAuth);

// --- 4. ROTAS DA API ---
// (As APIs /members, /punir, /channels, /settings, /settings/save, /tickets continuam as mesmas da resposta anterior)
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
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) { /* ... handler de comandos ... */ }

    if (interaction.isButton()) {
        if (!interaction.customId.startsWith('open-ticket')) return;

        await interaction.deferReply({ ephemeral: true });
        const settings = readSettings();
        const category = settings.ticketCategoryId;
        
        try {
            const channelName = `ticket-${interaction.user.username.substring(0, 20)}`;
            if (interaction.guild.channels.cache.find(c => c.name === channelName)) {
                return interaction.editReply(`⚠️ Você já possui um ticket aberto.`);
            }

            const ticketChannel = await interaction.guild.channels.create({
                name: channelName, type: ChannelType.GuildText, parent: category,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: process.env.STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
                ],
            });
            
            await interaction.editReply(`✅ Seu ticket foi criado em ${ticketChannel}`);
            
            const baseEmbed = new EmbedBuilder().setColor('#5865F2').setDescription(`Olá ${interaction.user}, bem-vindo ao seu ticket!`);

            switch (interaction.customId) {
                case 'open-ticket-normal':
                    await ticketChannel.send({ embeds: [baseEmbed.addFields({ name: 'Próximo Passo', value: 'Um membro da equipe estará com você em breve.'})] });
                    break;
                
                case 'open-ticket-ai':
                    await ticketChannel.send({ embeds: [baseEmbed.addFields({ name: 'Assistente de IA', value: 'Nosso assistente de IA está analisando sua solicitação...' })] });
                    const aiResponse = await generateAiResponse(`O usuário ${interaction.user.tag} abriu um ticket pedindo ajuda.`);
                    await ticketChannel.send({ embeds: [new EmbedBuilder().setColor("#2ECC71").setAuthor({ name: "Assistente de IA 🤖" }).setDescription(aiResponse)] });
                    break;

                case 'open-ticket-staff':
                    const staffPing = process.env.STAFF_ROLE_ID ? `<@&${process.env.STAFF_ROLE_ID}>` : 'A equipe de suporte';
                    await ticketChannel.send({
                        content: `${staffPing}, ${interaction.user} solicitou suporte urgente!`,
                        embeds: [baseEmbed.setColor('#E74C3C').addFields({ name: 'Atenção Urgente', value: 'A equipe foi notificada e estará com você o mais rápido possível.' })]
                    });
                    break;
            }
        } catch (error) {
            console.error("Erro ao processar botão de ticket:", error);
            await interaction.editReply({ content: '❌ Ocorreu um erro. Verifique as configurações no painel.' });
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