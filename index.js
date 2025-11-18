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
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const settingsPath = path.join(__dirname, 'settings.json');
const usersPath = path.join(__dirname, 'users.json');

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) { client.commands.set(command.data.name, command); }
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
    resave: false, saveUninitialized: true,
    cookie: { secure: 'auto', maxAge: 1000 * 60 * 60 * 24 }
}));
const checkAuth = (req, res, next) => {
    if (req.session.loggedin) { return next(); }
    if (req.path.startsWith('/api/')) { return res.status(401).json({ message: 'Não autorizado. Faça o login novamente.' }); }
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
    } catch (error) { res.status(500).json({ message: 'Erro interno no servidor.' }); }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/index.html'));
});
app.use('/comandos.html', checkAuth);
app.use('/punir.html', checkAuth);
app.use('/config.html', checkAuth);
app.use('/ticket.html', checkAuth);

// --- 4. ROTAS DA API ---
app.get('/api/commands', checkAuth, (req, res) => {
    try {
        const commandList = client.commands.map(cmd => ({ name: cmd.data.name, description: cmd.data.description })).sort((a, b) => a.name.localeCompare(b.name));
        res.json(commandList);
    } catch (error) { res.status(500).json({ message: "Erro ao buscar comandos." }); }
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