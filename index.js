const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActivityType, ChannelType } = require('discord.js');
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

// Carregador de Comandos de Barra
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
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Erro ao ler settings.json:", error);
    }
    // Retorna o padrão da variável de ambiente se o arquivo não existir
    return { punishmentChannelId: process.env.punishment_channel_id };
}

function writeSettings(data) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Erro ao salvar settings.json:", error);
    }
}

// --- 2. MIDDLEWARES DO EXPRESS (CONFIGURAÇÕES DO SITE) ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto' }
}));

// Middleware para verificar se o usuário está logado
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
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

// Protege o acesso direto às páginas do painel
app.use('/punir.html', checkAuth);
app.use('/config.html', checkAuth);
app.use('/ticket.html', checkAuth);

// --- 4. ROTAS DA API (PROTEGIDAS) ---

// ROTA ATUALIZADA: Agora apenas lê do cache, sem `fetch`
app.get('/api/members', checkAuth, async (req, res) => {
    try {
        const guild = await client.guilds.fetch(process.env.guildId);
        // Apenas lemos o que já está na memória do bot.
        const memberList = guild.members.cache
            .filter(member => !member.user.bot)
            .map(member => ({ id: member.id, tag: member.user.tag }))
            .sort((a, b) => a.tag.localeCompare(b.tag));
        res.json(memberList);
    } catch (error) {
        console.error("Erro ao buscar membros do cache:", error);
        res.status(500).json({ message: "Erro ao ler a lista de membros." });
    }
});

app.post('/api/punir', checkAuth, async (req, res) => {
    try {
        const settings = readSettings();
        const { userId, punishment, duration, reason, evidence } = req.body;
        const moderator = req.session.username;

        if (!userId || !punishment || !reason) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
        }

        const guild = await client.guilds.fetch(process.env.guildId);
        const member = await guild.members.fetch(userId);
        const punishmentChannel = await guild.channels.fetch(settings.punishmentChannelId);

        if (!member) {
            return res.status(404).json({ message: 'Membro não encontrado.' });
        }
        if (!punishmentChannel) {
            return res.status(404).json({ message: 'Canal de log não configurado ou inválido.' });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('Ação de Moderação Registrada')
            .addFields(
                { name: 'Membro Punido', value: member.user.tag, inline: true },
                { name: 'Aplicado por', value: moderator, inline: true },
                { name: 'Ação', value: punishment.charAt(0).toUpperCase() + punishment.slice(1), inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();
        
        if (evidence) {
            embed.addFields({ name: 'Evidência', value: `[Clique para ver](${evidence})` });
        }

        if (punishment === 'timeout') {
            const minutes = parseInt(duration);
            if (!minutes || minutes <= 0 || isNaN(minutes)) {
                return res.status(400).json({ message: 'Duração inválida.' });
            }
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

app.get('/api/channels', checkAuth, async (req, res) => {
    try {
        const guild = await client.guilds.fetch(process.env.guildId);
        const channels = guild.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .map(ch => ({ id: ch.id, name: ch.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(channels);
    } catch (error) {
        console.error('Erro ao buscar canais:', error);
        res.status(500).json({ message: 'Erro ao buscar canais.' });
    }
});

app.get('/api/settings', checkAuth, (req, res) => {
    res.json(readSettings());
});

app.post('/api/settings/save', checkAuth, (req, res) => {
    try {
        const currentSettings = readSettings();
        const newSettings = { ...currentSettings, ...req.body };
        writeSettings(newSettings);
        res.status(200).json({ message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar:', error);
        res.status(500).json({ message: 'Falha ao salvar configurações.' });
    }
});


// --- 5. EVENTOS DO BOT ---
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

// EVENTO READY ATUALIZADO: Agora ele popula o cache na inicialização
client.once('ready', async () => {
    console.log(`[BOT] Conectado como ${client.user.tag}.`);
    client.user.setActivity('Painel de Moderação', { type: ActivityType.Watching });

    try {
        console.log('[CACHE] Iniciando o cache de membros do servidor...');
        const guild = await client.guilds.fetch(process.env.guildId);
        await guild.members.fetch({ force: true });
        console.log(`[CACHE] Sucesso! ${guild.members.cache.size} membros foram carregados na memória.`);
    } catch (error) {
        console.error('[CACHE] Falha crítica ao carregar membros no cache:', error.message);
    }
});


// --- 6. INICIALIZAÇÃO ---
client.login(process.env.token).then(() => {
    app.listen(port, () => {
        console.log(`[WEB] Servidor iniciado na porta ${port}. Painel pronto para uso.`);
    });
}).catch(err => {
    console.error("[ERRO CRÍTICO] Falha ao fazer login com o bot:", err.message);
    process.exit(1);
});