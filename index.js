const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
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

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// --- 2. MIDDLEWARES DO EXPRESS ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto' }
}));

// Middleware para proteger rotas
const checkAuth = (req, res, next) => {
    if (req.session.loggedin) {
        next();
    } else {
        res.status(401).redirect('/login.html');
    }
};

// --- 3. ROTAS DO SITE ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.loggedin = true;
        req.session.username = username;
        res.status(200).json({ message: 'Login bem-sucedido!' });
    } else {
        res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

// Protegendo as páginas do painel
app.get('/punir.html', checkAuth);
app.get('/config.html', checkAuth);
app.get('/ticket.html', checkAuth);

// --- 4. ROTAS DA API (PROTEGIDAS) ---
app.get('/api/members', checkAuth, async (req, res) => { /* ...código da API de membros ... */ });
app.post('/api/punir', checkAuth, async (req, res) => {
    const { username, punishment, duration, reason, evidence } = req.body;
    const moderator = req.session.username; // Pega o nome do admin logado

    // ... Lógica de punição atualizada ...
    const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('Ação de Moderação Registrada')
        .addFields(
            { name: 'Membro Punido', value: username, inline: true },
            { name: 'Ação', value: punishment, inline: true },
            { name: 'Aplicado por', value: moderator, inline: true },
            { name: 'Motivo', value: reason }
        );
    if (evidence) embed.addFields({ name: 'Evidência', value: `[Clique para ver](${evidence})` });
    // ... resto da lógica de punição ...
});

// --- 5. EVENTOS DO BOT ---
client.once('ready', () => { /* ... código 'ready' ... */ });

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
    }
});

// --- 6. INICIALIZAÇÃO ---
client.login(process.env.token).then(() => {
    app.listen(port, () => { console.log(`[WEB] Servidor iniciado na porta ${port}.`); });
});
