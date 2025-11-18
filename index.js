const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('node:fs');

// --- 1. CONFIGURAÇÕES E INICIALIZAÇÃO ---
const app = express();
const port = process.env.PORT || 3000;
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] // GuildMembers é crucial!
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
    if (req.session.loggedin) {
        next();
    } else {
        res.redirect('/login.html');
    }
};

// --- 3. ROTAS DO SITE ---
app.get('/', (req, res) => res.redirect('/login.html'));
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
    req.session.destroy(() => res.redirect('/login.html'));
});

// Protegendo o acesso direto aos arquivos HTML
app.use('/punir.html', checkAuth);
app.use('/config.html', checkAuth);
app.use('/ticket.html', checkAuth);

// --- 4. ROTAS DA API (PROTEGIDAS) ---
app.get('/api/members', checkAuth, async (req, res) => {
    try {
        const guild = await client.guilds.fetch(process.env.guildId);
        await guild.members.fetch({ force: true }); // Força a busca de todos os membros

        const memberList = guild.members.cache
            .filter(member => !member.user.bot)
            .map(member => ({ id: member.id, tag: member.user.tag }))
            .sort((a, b) => a.tag.localeCompare(b.tag));

        res.json(memberList);
    } catch (error) {
        console.error("Erro ao buscar membros:", error);
        res.status(500).json({ message: "Erro ao buscar membros. Verifique as permissões do bot." });
    }
});

app.post('/api/punir', checkAuth, async (req, res) => {
    try {
        const { userId, punishment, duration, reason, evidence } = req.body;
        const moderator = req.session.username;

        if (!userId || !punishment || !reason) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
        }

        const guild = await client.guilds.fetch(process.env.guildId);
        const member = await guild.members.fetch(userId); // Busca o membro pelo ID
        const punishmentChannel = await guild.channels.fetch(process.env.punishment_channel_id);

        if (!member) {
            return res.status(404).json({ message: 'Membro não encontrado.' });
        }

        const embed = new EmbedBuilder()
            .setColor('#E74C3C').setTitle('Ação de Moderação Registrada')
            .addFields(
                { name: 'Membro Punido', value: member.user.tag, inline: true },
                { name: 'Aplicado por', value: moderator, inline: true },
                { name: 'Ação', value: punishment.charAt(0).toUpperCase() + punishment.slice(1), inline: true },
                { name: 'Motivo', value: reason }
            ).setTimestamp();
        
        if (evidence) embed.addFields({ name: 'Evidência', value: `[Clique para ver](${evidence})` });

        if (punishment === 'timeout') {
            const minutes = parseInt(duration);
            if (!minutes || minutes <= 0 || isNaN(minutes)) return res.status(400).json({ message: 'Duração inválida.' });
            await member.timeout(minutes * 60 * 1000, reason);
            embed.addFields({ name: 'Duração', value: `${minutes} minuto(s)` });
        } else if (punishment === 'kick') {
            await member.kick(reason);
        } else if (punishment === 'ban') {
            await member.ban({ reason: reason });
        }

        await punishmentChannel.send({ embeds: [embed] });
        res.status(200).json({ message: `Sucesso! ${member.user.tag} foi punido.` });

    } catch (error) {
        console.error('ERRO AO PUNIR:', error);
        res.status(500).json({ message: 'Erro interno. Verifique as permissões do bot.' });
    }
});

// --- 5. EVENTOS DO BOT ---
client.on('interactionCreate', async interaction => { /* ...código do handler de comandos... */ });
client.once('ready', () => { /* ...código 'ready'... */ });

// --- 6. INICIALIZAÇÃO ---
client.login(process.env.token).then(() => {
    app.listen(port, () => { console.log(`[WEB] Servidor iniciado na porta ${port}.`); });
}).catch(console.error);
